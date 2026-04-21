// services/workspace-service/src/controllers/workspaceController.js
const crypto = require('crypto');
const { Workspace, WorkspaceMember, Invitation } = require('../models');
const redis = require('../utils/redis');
const logger = require('../utils/logger');

exports.createWorkspace = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ error: 'User ID required' });

    const workspace = await Workspace.create({ name, description, ownerId: userId });
    await WorkspaceMember.create({ workspaceId: workspace.id, userId, role: 'owner' });

    await redis.publish('workspace-events', JSON.stringify({ type: 'WORKSPACE_CREATED', workspaceId: workspace.id, userId }));
    logger.info({ event: 'workspace_created', workspaceId: workspace.id, userId });
    res.status(201).json({ workspace });
  } catch (err) { next(err); }
};

exports.getWorkspace = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.headers['x-user-id'];
    const member = await WorkspaceMember.findOne({ where: { workspaceId: id, userId } });
    if (!member) return res.status(403).json({ error: 'Access denied' });
    const workspace = await Workspace.findByPk(id, { include: [{ model: WorkspaceMember, as: 'members' }] });
    if (!workspace) return res.status(404).json({ error: 'Workspace not found' });
    res.json({ workspace });
  } catch (err) { next(err); }
};

exports.listWorkspaces = async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'];
    const memberships = await WorkspaceMember.findAll({
      where: { userId },
      include: [{ model: Workspace, as: 'workspace' }],
    });
    const workspaces = memberships.map((m) => ({ ...m.workspace?.toJSON(), userRole: m.role }));
    res.json({ workspaces });
  } catch (err) { next(err); }
};

exports.updateWorkspace = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.headers['x-user-id'];
    const member = await WorkspaceMember.findOne({ where: { workspaceId: id, userId, role: ['owner', 'admin'] } });
    if (!member) return res.status(403).json({ error: 'Insufficient permissions' });
    const [, [workspace]] = await Workspace.update(req.body, { where: { id }, returning: true });
    res.json({ workspace });
  } catch (err) { next(err); }
};

exports.inviteMember = async (req, res, next) => {
  try {
    const { id: workspaceId } = req.params;
    const { email, role = 'member' } = req.body;
    const userId = req.headers['x-user-id'];

    const member = await WorkspaceMember.findOne({ where: { workspaceId, userId, role: ['owner', 'admin'] } });
    if (!member) return res.status(403).json({ error: 'Only owners/admins can invite' });

    const token = crypto.randomBytes(32).toString('hex');
    const invitation = await Invitation.create({
      workspaceId, email, role, token, invitedBy: userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    await redis.publish('workspace-events', JSON.stringify({
      type: 'MEMBER_INVITED', workspaceId, email, role, token, invitedBy: userId,
    }));

    res.status(201).json({ invitation: { id: invitation.id, email, role, expiresAt: invitation.expiresAt } });
  } catch (err) { next(err); }
};

exports.getMembers = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.headers['x-user-id'];
    const requester = await WorkspaceMember.findOne({ where: { workspaceId: id, userId } });
    if (!requester) return res.status(403).json({ error: 'Access denied' });
    const members = await WorkspaceMember.findAll({ where: { workspaceId: id } });
    res.json({ members });
  } catch (err) { next(err); }
};
