const userService = require('../services/user.service');

async function listUsers(req, res, next) {
  try {
    const data = await userService.listUsers();
    res.status(200).json({
      status: 'SUCCESS',
      data
    });
  } catch (err) {
    next(err);
  }
}

async function createUser(req, res, next) {
  try {
    const { name, email, password, role, district_id, village_id } = req.body || {};
    const user = await userService.createUser({ name, email, password, role, district_id, village_id });
    res.status(201).json({
      status: 'SUCCESS',
      message: 'User created successfully',
      data: { user }
    });
  } catch (err) {
    next(err);
  }
}

async function updateUser(req, res, next) {
  try {
    const { id } = req.params;
    const { name, email, password, role, district_id, village_id } = req.body || {};
    const user = await userService.updateUser(id, { name, email, password, role, district_id, village_id });
    res.status(200).json({
      status: 'SUCCESS',
      message: 'User updated successfully',
      data: { user }
    });
  } catch (err) {
    next(err);
  }
}

async function deleteUser(req, res, next) {
  try {
    const { id } = req.params;
    const result = await userService.deleteUser(id);
    res.status(200).json({
      status: 'SUCCESS',
      message: 'User deleted successfully',
      data: result
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listUsers,
  createUser,
  updateUser,
  deleteUser
};

async function getAdminStats(req, res, next) {
  try {
    const data = await userService.getAdminStats();
    res.status(200).json({
      status: 'SUCCESS',
      data
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  getAdminStats
};
