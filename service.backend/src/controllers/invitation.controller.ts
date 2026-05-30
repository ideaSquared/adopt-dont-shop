import { Request, type Response } from 'express';
import { sendValidationErrors } from '../middleware/validation';
import { InvitationService } from '../services/invitation.service';
import User from '../models/User';

export class InvitationController {
  static async acceptInvitation(req: Request, res: Response) {
    if (sendValidationErrors(req, res)) {
      return;
    }

    const { token, firstName, lastName, password, title } = req.body;

    const result = await InvitationService.acceptInvitation(token, {
      firstName,
      lastName,
      password,
      title,
    });

    res.status(201).json(result);
  }

  static async getDetails(req: Request, res: Response) {
    if (sendValidationErrors(req, res)) {
      return;
    }

    const { token } = req.params;

    const invitation = await InvitationService.getInvitationDetails(token as string);

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: 'Invitation not found or expired',
      });
    }

    const invitationWithRescue = invitation as typeof invitation & {
      rescue?: { name?: string | null } | null;
    };
    const rescueName = invitationWithRescue.rescue?.name ?? null;

    let invitedByName: string | null = null;
    if (invitation.invited_by) {
      const inviter = await User.findOne({
        where: { userId: invitation.invited_by },
        attributes: ['firstName', 'lastName'],
      });
      if (inviter) {
        const fullName = `${inviter.firstName} ${inviter.lastName}`.trim();
        invitedByName = fullName.length > 0 ? fullName : null;
      }
    }

    res.json({
      success: true,
      invitation: {
        email: invitation.email,
        expiresAt: invitation.expiration,
        rescueName,
        invitedByName,
        role: invitation.title ?? null,
      },
    });
  }
}
