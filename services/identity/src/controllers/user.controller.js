'use strict';

function createUserController({ userService }) {
  return {
    list: async (req, res) => {
      res.json(await userService.list(req.validated.query));
    },
    create: async (req, res) => {
      res.status(201).json(await userService.create(req.validated.body));
    },
    getById: async (req, res) => {
      res.json(await userService.getById(req.validated.params.id));
    },
    update: async (req, res) => {
      res.json(await userService.update(req.validated.params.id, req.validated.body));
    },
    deactivate: async (req, res) => {
      res.json(await userService.deactivate(req.validated.params.id, req.user));
    },
    activate: async (req, res) => {
      res.json(await userService.activate(req.validated.params.id));
    },
    resetPassword: async (req, res) => {
      await userService.resetPassword(req.validated.params.id, req.validated.body.newPassword);
      res.status(204).end();
    },
  };
}

module.exports = { createUserController };
