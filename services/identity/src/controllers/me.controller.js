'use strict';

function createMeController({ userService }) {
  return {
    getProfile: async (req, res) => {
      res.json(await userService.getProfile(req.user.id));
    },
    updateProfile: async (req, res) => {
      res.json(await userService.updateProfile(req.user.id, req.validated.body));
    },
  };
}

module.exports = { createMeController };
