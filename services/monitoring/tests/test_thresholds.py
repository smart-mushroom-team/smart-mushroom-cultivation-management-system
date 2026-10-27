from app.thresholds import _check


def test_alert_after_n_consecutive():
    cnt, al, fire = 0, False, False
    for v in (35, 36, 37):
        cnt, al, fire = _check(None, "r", "TEMP", v, 20, 30, 3, cnt, al)
    assert fire and al


def test_reset_when_back_to_normal():
    assert _check(None, "r", "TEMP", 25, 20, 30, 3, 2, False) == (0, False, False)


def test_no_duplicate_alert_while_alerting():
    assert _check(None, "r", "TEMP", 40, 20, 30, 3, 5, True)[2] is False
