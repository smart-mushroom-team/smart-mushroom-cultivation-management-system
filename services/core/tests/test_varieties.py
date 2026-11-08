"""Bước 5j+: danh mục giống nấm, chọn giống lúc thuê, duyệt giống tự nhập, khách đổi giống."""
import uuid

from conftest import advance, cycles, make_token, rent  # noqa: F401
from sqlalchemy import text


def new_variety(client, operator, name="Nấm thử", **kw):
    body = {"name": name, "description": "mô tả", "growthDays": 30, "tempMin": 20, "tempMax": 28, "humMin": 80, "humMax": 90, **kw}
    r = client.post("/varieties", json=body, headers=operator)
    assert r.status_code == 201, r.text
    return r.json()


def rent_with(client, farm, n=1, **choice):
    h = make_token("CUSTOMER", str(uuid.uuid4()), "Khách A")
    r = client.post("/rentals", json={"packageId": farm["pkg"], "trayCount": n, **choice}, headers=h)
    return h, r


def notes(db, type_, **where):
    with db.connect() as c:
        return c.execute(text("SELECT title, content, recipient_role FROM notifications WHERE type=:t"), {"t": type_}).all()


# ---------------------------------------------------------------- danh mục
def test_catalog_crud_and_permissions(client, operator, customer):
    v = new_variety(client, operator, "Nấm A")
    assert v["growth_days"] == 30 and v["temp_min"] == 20.0 and v["is_active"] is True
    tiny = {"growthDays": 1, "tempMin": 1, "tempMax": 2, "humMin": 1, "humMax": 2}
    assert client.post("/varieties", json={"name": "x", **tiny}, headers=customer).status_code == 403
    dup = client.post("/varieties", json={"name": "  nấm a ", "growthDays": 1, "tempMin": 1, "tempMax": 2, "humMin": 1, "humMax": 2}, headers=operator)
    assert dup.status_code == 409 and dup.json()["error"]["code"] == "VARIETY_EXISTS"
    bad = client.post("/varieties", json={"name": "B", "growthDays": 1, "tempMin": 30, "tempMax": 20, "humMin": 1, "humMax": 2}, headers=operator)
    assert bad.status_code == 422
    assert client.post("/varieties", json={"name": "   ", **tiny}, headers=operator).status_code == 422

    assert [x["name"] for x in client.get("/varieties", headers=customer).json()] == ["Nấm A"]
    r = client.patch(f"/varieties/{v['id']}", json={"growthDays": 40, "isActive": False}, headers=operator)
    assert r.status_code == 200 and r.json()["growth_days"] == 40 and r.json()["is_active"] is False
    assert client.get("/varieties", headers=customer).json() == []                       # đã tắt thì khách không thấy
    assert len(client.get("/varieties/all", headers=operator).json()) == 1
    assert client.get("/varieties/all", headers=customer).status_code == 403
    assert client.patch(f"/varieties/{v['id']}", json={"tempMin": 50}, headers=operator).status_code == 422   # min > max sau khi gộp
    assert client.patch(f"/varieties/{uuid.uuid4()}", json={"name": "Z"}, headers=operator).status_code == 404
    other = new_variety(client, operator, "Nấm B")
    assert client.patch(f"/varieties/{other['id']}", json={"name": "NẤM A"}, headers=operator).status_code == 409


# ---------------------------------------------------------------- thuê kèm giống
def test_rent_without_variety_is_none(client, farm):
    h, r = rent_with(client, farm)
    assert r.status_code == 201 and r.json()["varietyStatus"] == "NONE" and r.json()["variety"] is None
    assert client.get("/my-trays", headers=h).json()[0]["variety_status"] == "NONE"


def test_rent_with_catalog_variety_is_approved_for_all_trays(client, farm, operator, db):
    v = new_variety(client, operator, "Nấm bào ngư X")
    h, r = rent_with(client, farm, 2, varietyId=v["id"])
    assert r.status_code == 201 and r.json()["varietyStatus"] == "APPROVED"
    rows = client.get("/my-trays", headers=h).json()
    assert {x["variety"] for x in rows} == {"Nấm bào ngư X"} and {x["variety_status"] for x in rows} == {"APPROVED"}
    assert {x["variety_id"] for x in rows} == {v["id"]}
    assert notes(db, "VARIETY_PENDING") == []


def test_rent_with_custom_name_matching_catalog_is_approved(client, farm, operator):
    new_variety(client, operator, "Nấm Sò")
    h, r = rent_with(client, farm, customVariety="  nấm   sò ")
    assert r.json()["varietyStatus"] == "APPROVED" and r.json()["variety"] == "Nấm Sò"


def test_rent_with_unknown_name_is_pending_and_notifies_staff_once(client, farm, db):
    h, r = rent_with(client, farm, 2, customVariety="Nấm Lạ")
    assert r.status_code == 201 and r.json()["varietyStatus"] == "PENDING"
    got = notes(db, "VARIETY_PENDING")
    assert len(got) == 1 and got[0].recipient_role == "STAFF" and "Nấm Lạ" in got[0].content


def test_rent_variety_input_errors_and_no_partial_rental(client, farm, operator, db):
    v = new_variety(client, operator, "Nấm C")
    h = make_token("CUSTOMER")
    base = {"packageId": farm["pkg"], "trayCount": 1}
    assert client.post("/rentals", json={**base, "varietyId": v["id"], "customVariety": "x"}, headers=h).status_code == 422
    assert client.post("/rentals", json={**base, "customVariety": "   "}, headers=h).status_code == 422
    r = client.post("/rentals", json={**base, "varietyId": str(uuid.uuid4())}, headers=h)
    assert r.status_code == 404 and r.json()["error"]["code"] == "VARIETY_NOT_FOUND"
    assert client.post("/rentals", json={**base, "varietyId": "không-phải-uuid"}, headers=h).status_code == 404
    client.patch(f"/varieties/{v['id']}", json={"isActive": False}, headers=operator)
    assert client.post("/rentals", json={**base, "varietyId": v["id"]}, headers=h).status_code == 404   # giống đã tắt
    with db.connect() as c:
        assert c.execute(text("SELECT count(*) FROM rentals")).scalar() == 0                          # không giữ khay/đơn nào


# ---------------------------------------------------------------- duyệt
def pending_cycle(client, farm, operator, n=2, name="Nấm Lạ"):
    h, r = rent_with(client, farm, n, customVariety=name)
    return h, r.json(), cycles(client, operator)


def test_pending_blocks_stage_change_until_approved(client, farm, operator, db):
    h, rental, cs = pending_cycle(client, farm, operator)
    cid = cs[0]["id"]
    r = client.patch(f"/cycles/{cid}", json={"stage": "INCUBATING"}, headers=operator)
    assert r.status_code == 409 and r.json()["error"]["code"] == "VARIETY_NOT_APPROVED"
    assert [c["id"] for c in cycles_by(client, operator, "PENDING")] == [c["id"] for c in cs]

    ok = client.post(f"/cycles/{cid}/variety/approve", headers=operator)
    assert ok.status_code == 200 and ok.json()["updated"] == 2                          # cả đơn cùng tên giống
    assert {c["variety_status"] for c in cycles(client, operator)} == {"APPROVED"}
    assert client.patch(f"/cycles/{cid}", json={"stage": "INCUBATING"}, headers=operator).status_code == 200
    mine = [n for n in notes(db, "VARIETY_APPROVED")]
    assert len(mine) == 1 and "Nấm Lạ" in mine[0].content
    again = client.post(f"/cycles/{cid}/variety/approve", headers=operator)
    assert again.status_code == 409 and again.json()["error"]["code"] == "VARIETY_NOT_PENDING"


def cycles_by(client, operator, vs):
    return client.get(f"/cycles?varietyStatus={vs}", headers=operator).json()


def test_reject_needs_reason_then_customer_picks_catalog_variety(client, farm, operator, db):
    h, rental, cs = pending_cycle(client, farm, operator, n=1)
    cid = cs[0]["id"]
    assert client.post(f"/cycles/{cid}/variety/reject", json={"reason": "  "}, headers=operator).status_code == 422
    assert client.post(f"/cycles/{cid}/variety/reject", json={}, headers=operator).status_code == 422
    ok = client.post(f"/cycles/{cid}/variety/reject", json={"reason": "Giống không phù hợp phòng"}, headers=operator)
    assert ok.status_code == 200
    row = client.get(f"/cycles/{cid}", headers=h).json()
    assert row["variety_status"] == "REJECTED" and row["variety_reject_reason"] == "Giống không phù hợp phòng"
    assert client.patch(f"/cycles/{cid}", json={"stage": "INCUBATING"}, headers=operator).status_code == 409   # bị từ chối cũng chặn

    v = new_variety(client, operator, "Nấm Chuẩn")
    r = client.put(f"/cycles/{cid}/variety", json={"varietyId": v["id"]}, headers=h)
    assert r.status_code == 200 and r.json()["variety"] == "Nấm Chuẩn" and r.json()["variety_status"] == "APPROVED"
    assert r.json()["variety_reject_reason"] is None
    assert client.patch(f"/cycles/{cid}", json={"stage": "INCUBATING"}, headers=operator).status_code == 200
    assert len(notes(db, "VARIETY_REJECTED")) == 1


def test_customer_set_variety_rules(client, farm, operator, db):
    h, r = rent_with(client, farm)
    cid = client.get("/my-trays", headers=h).json()[0]["id"]
    assert client.put(f"/cycles/{cid}/variety", json={}, headers=h).status_code == 422                   # phải chọn gì đó
    assert client.put(f"/cycles/{cid}/variety", json={"customVariety": "Nấm Mới"}, headers=h).json()["variety_status"] == "PENDING"
    assert client.put(f"/cycles/{cid}/variety", json={"customVariety": "Nấm Mới"}, headers=h).status_code == 200   # gửi lặp không nhân thông báo
    assert len(notes(db, "VARIETY_PENDING")) == 1
    other = make_token("CUSTOMER")
    assert client.put(f"/cycles/{cid}/variety", json={"customVariety": "x"}, headers=other).status_code == 404   # BR-02
    assert client.put(f"/cycles/{cid}/variety", json={"customVariety": "x"}, headers=operator).status_code == 403
    assert client.put(f"/cycles/{uuid.uuid4()}/variety", json={"customVariety": "x"}, headers=h).status_code == 404
    assert client.put("/cycles/khong-uuid/variety", json={"customVariety": "x"}, headers=h).status_code == 404

    client.patch(f"/cycles/{cid}", json={"variety": "Nấm Ổn"}, headers=operator)                        # Operator nhập tay = đã duyệt
    advance(client, operator, cid, "INCUBATING")
    late = client.put(f"/cycles/{cid}/variety", json={"customVariety": "y"}, headers=h)
    assert late.status_code == 409 and late.json()["error"]["code"] == "VARIETY_LOCKED"


def test_operator_variety_edit_is_approved_and_matches_catalog(client, farm, operator):
    v = new_variety(client, operator, "Nấm Chuẩn 2")
    h, r = rent_with(client, farm)
    cid = cycles(client, operator)[0]["id"]
    out = client.patch(f"/cycles/{cid}", json={"variety": "nấm chuẩn 2"}, headers=operator).json()
    assert out["variety"] == "Nấm Chuẩn 2" and out["variety_id"] == v["id"] and out["variety_status"] == "APPROVED"
    blank = client.patch(f"/cycles/{cid}", json={"variety": "   ", "note": "n"}, headers=operator).json()
    assert blank["variety"] == "Nấm Chuẩn 2"                                                            # chuỗi rỗng không xóa giống
    assert client.get("/cycles?varietyStatus=XYZ", headers=operator).status_code == 422


def test_pending_and_stage_in_one_patch_is_blocked_unless_operator_sets_variety(client, farm, operator):
    h, rental, cs = pending_cycle(client, farm, operator, n=1)
    cid = cs[0]["id"]
    assert client.patch(f"/cycles/{cid}", json={"stage": "INCUBATING"}, headers=operator).status_code == 409
    both = client.patch(f"/cycles/{cid}", json={"stage": "INCUBATING", "variety": "Nấm Đã Chốt"}, headers=operator)
    assert both.status_code == 200 and both.json()["variety_status"] == "APPROVED" and both.json()["stage"] == "INCUBATING"


# ---------------------------------------------------------------- khoảng phù hợp của giống (đánh giá số đo trên app)
def test_variety_info_follows_catalog_variety_only(client, farm, operator):
    v = new_variety(client, operator, "Nấm Có Khoảng", growthDays=35, tempMin=20, tempMax=28.5, humMin=80, humMax=90)
    h, _ = rent_with(client, farm, varietyId=v["id"])
    row = client.get("/my-trays", headers=h).json()[0]
    assert row["variety_info"] == {"growth_days": 35, "temp_min": 20.0, "temp_max": 28.5, "hum_min": 80.0, "hum_max": 90.0}
    assert "vi_temp_min" not in row
    assert client.get(f"/cycles/{row['id']}", headers=h).json()["variety_info"]["temp_max"] == 28.5
    # giống đã tắt trong danh mục vẫn giữ khoảng cho các khay đang nuôi
    client.patch(f"/varieties/{v['id']}", json={"isActive": False}, headers=operator)
    assert client.get("/my-trays", headers=h).json()[0]["variety_info"] is not None

    h2, _ = rent_with(client, farm)
    assert client.get("/my-trays", headers=h2).json()[0]["variety_info"] is None                      # chưa chọn giống
    h3, _ = rent_with(client, farm, customVariety="Nấm Tự Nhập")
    assert client.get("/my-trays", headers=h3).json()[0]["variety_info"] is None                      # chờ duyệt


def test_approve_with_catalog_entry_links_whole_rental_and_adds_variety(client, farm, operator):
    h, rental, cs = pending_cycle(client, farm, operator, n=2, name="Nấm Mới Toanh")
    body = {"addToCatalog": {"growthDays": 40, "tempMin": 18, "tempMax": 26, "humMin": 85, "humMax": 95, "description": "Giống mới"}}
    r = client.post(f"/cycles/{cs[0]['id']}/variety/approve", json=body, headers=operator)
    assert r.status_code == 200 and r.json()["updated"] == 2 and r.json()["addedToCatalog"] is True
    cat = [v for v in client.get("/varieties", headers=h).json() if v["name"] == "Nấm Mới Toanh"]
    assert len(cat) == 1 and cat[0]["growth_days"] == 40 and cat[0]["description"] == "Giống mới"
    rows = client.get("/my-trays", headers=h).json()
    assert {x["variety_id"] for x in rows} == {cat[0]["id"]} and {x["variety_status"] for x in rows} == {"APPROVED"}
    assert rows[0]["variety_info"]["hum_min"] == 85.0


def test_plain_approve_keeps_no_info_and_bad_catalog_entry_is_rejected(client, farm, operator):
    h, rental, cs = pending_cycle(client, farm, operator, n=1, name="Nấm Chỉ Duyệt")
    cid = cs[0]["id"]
    bad = {"addToCatalog": {"growthDays": 40, "tempMin": 30, "tempMax": 26, "humMin": 85, "humMax": 95}}
    assert client.post(f"/cycles/{cid}/variety/approve", json=bad, headers=operator).status_code == 422
    assert client.get(f"/cycles/{cid}", headers=operator).json()["variety_status"] == "PENDING"        # chưa đổi gì
    ok = client.post(f"/cycles/{cid}/variety/approve", headers=operator)
    assert ok.status_code == 200 and ok.json()["addedToCatalog"] is False
    row = client.get("/my-trays", headers=h).json()[0]
    assert row["variety_status"] == "APPROVED" and row["variety_info"] is None


def test_approve_with_catalog_entry_conflicts_with_disabled_same_name(client, farm, operator):
    off = new_variety(client, operator, "Nấm Đã Tắt")
    client.patch(f"/varieties/{off['id']}", json={"isActive": False}, headers=operator)
    h, rental, cs = pending_cycle(client, farm, operator, n=1, name="Nấm Đã Tắt")
    cid = cs[0]["id"]
    body = {"addToCatalog": {"growthDays": 40, "tempMin": 18, "tempMax": 26, "humMin": 85, "humMax": 95}}
    r = client.post(f"/cycles/{cid}/variety/approve", json=body, headers=operator)
    assert r.status_code == 409 and r.json()["error"]["code"] == "VARIETY_EXISTS"
    assert client.get(f"/cycles/{cid}", headers=operator).json()["variety_status"] == "PENDING"        # giao dịch được hoàn lại
