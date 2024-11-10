import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { Op } from 'sequelize'
import {
  Invitation,
  RescueCreationAttributes,
  Rescue as RescueModel,
  Role,
  StaffMember,
  User,
  UserCreationAttributes,
} from '../Models/'
import { Rescue, UserWithRoles } from '../types'
import { generateUUID } from '../utils/generateUUID'
import { AuditLogger } from './auditLogService'
import { sendPasswordResetEmail, sendVerificationEmail } from './emailService'
import { getRolesForUser } from './permissionService'
interface UserResponse {
  users: UserWithRoles[]
}

export const getAllUsersService = async (): Promise<UserResponse> => {
  const users: User[] = await User.findAll()

  const usersWithRoles: UserWithRoles[] = await Promise.all(
    users.map(async (user: User): Promise<UserWithRoles> => {
      const roles = await getRolesForUser(user.user_id)
      return {
        user_id: user.user_id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        roles,
      }
    }),
  )

  return {
    users: usersWithRoles,
  }
}

export const loginUser = async (
  email: string,
  password: string,
): Promise<{ token: string; user: UserWithRoles; rescue?: Rescue | null }> => {
  try {
    const user = await User.scope('withPassword').findOne({
      where: { email },
    })

    if (!user) {
      await AuditLogger.logAction(
        'AuthService',
        `Failed login attempt for email: ${email}`,
        'WARNING',
      )
      throw new Error('Invalid email or password')
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      await AuditLogger.logAction(
        'AuthService',
        `Failed login attempt for email: ${email}`,
        'WARNING',
        user.user_id,
      )
      throw new Error('Invalid email or password')
    }

    const roles = await getRolesForUser(user.user_id)
    const secretKey = process.env.SECRET_KEY
    if (!secretKey) {
      await AuditLogger.logAction(
        'AuthService',
        'Missing SECRET_KEY environment variable',
        'ERROR',
      )
      throw new Error('Internal server error')
    }

    const token = jwt.sign({ userId: user.user_id, roles }, secretKey, {
      expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    })

    const { password: _, ...userWithoutPassword } = user.toJSON()
    const userWithRoles: UserWithRoles = { ...userWithoutPassword, roles }

    let rescue: Rescue | null = null
    if (roles.includes('staff')) {
      rescue = (await RescueModel.findOne({
        include: [
          {
            model: StaffMember,
            as: 'staffMembersAlias', // Use the same alias here
            where: { user_id: user.user_id },
            attributes: [], // Optional: Only include fields needed for filtering
          },
        ],
        attributes: [
          'rescue_id',
          'rescue_name',
          'rescue_type',
          'city',
          'country',
        ],
      })) as Rescue | null
    }

    await AuditLogger.logAction(
      'AuthService',
      `User logged in with email: ${email}`,
      'INFO',
      user.user_id,
    )

    return { token, user: userWithRoles, rescue }
  } catch (error) {
    if (error instanceof Error) {
      await AuditLogger.logAction(
        'AuthService',
        `Error during login: ${error.message}`,
        'ERROR',
      )
    } else {
      await AuditLogger.logAction(
        'AuthService',
        'Unknown error during login',
        'ERROR',
      )
    }
    throw error
  }
}

export const updateUserDetails = async (
  userId: string,
  updatedData: Partial<User>,
): Promise<User | null> => {
  try {
    const user = await User.findByPk(userId)

    if (!user) {
      await AuditLogger.logAction(
        'UserService',
        `Attempted to update non-existent user: ${userId}`,
        'WARNING',
        userId,
      )
      throw new Error('User not found')
    }

    await user.update(updatedData)
    await AuditLogger.logAction(
      'UserService',
      `Updated user details for user: ${userId}`,
      'INFO',
      userId,
    )

    return user
  } catch (error) {
    if (error instanceof Error) {
      await AuditLogger.logAction(
        'UserService',
        `Error updating user: ${error.message}`,
        'ERROR',
        userId,
      )
    } else {
      await AuditLogger.logAction(
        'UserService',
        'Unknown error updating user',
        'ERROR',
        userId,
      )
    }
    throw error
  }
}

export const changePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<boolean> => {
  try {
    const user = await User.scope('withPassword').findByPk(userId)

    if (!user) {
      await AuditLogger.logAction(
        'UserService',
        `Attempted to change password for non-existent user: ${userId}`,
        'WARNING',
        userId,
      )
      throw new Error('User not found')
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password)
    if (!isPasswordValid) {
      await AuditLogger.logAction(
        'UserService',
        `Incorrect current password attempt for user: ${userId}`,
        'WARNING',
        userId,
      )
      throw new Error('Current password is incorrect')
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10)
    user.password = hashedNewPassword
    await user.save()

    await AuditLogger.logAction(
      'UserService',
      `Password changed for user: ${userId}`,
      'INFO',
      userId,
    )

    return true
  } catch (error) {
    if (error instanceof Error) {
      await AuditLogger.logAction(
        'UserService',
        `Error changing password: ${error.message}`,
        'ERROR',
        userId,
      )
    } else {
      await AuditLogger.logAction(
        'UserService',
        'Unknown error changing password',
        'ERROR',
        userId,
      )
    }
    throw error
  }
}

export const forgotPassword = async (email: string): Promise<boolean> => {
  try {
    const user = await User.findOne({ where: { email } })

    if (!user) {
      await AuditLogger.logAction(
        'AuthService',
        `Password reset requested for non-existent email: ${email}`,
        'WARNING',
      )
      return false
    }

    const resetToken = generateUUID()
    user.reset_token = resetToken
    user.reset_token_expiration = new Date(Date.now() + 3600000) // 1 hour expiration
    await user.save()

    await sendPasswordResetEmail(user.email, resetToken)
    await AuditLogger.logAction(
      'AuthService',
      `Password reset email sent to: ${email}`,
      'INFO',
      user.user_id,
    )

    return true
  } catch (error) {
    if (error instanceof Error) {
      await AuditLogger.logAction(
        'AuthService',
        `Error requesting password reset: ${error.message}`,
        'ERROR',
      )
    } else {
      await AuditLogger.logAction(
        'AuthService',
        'Unknown error requesting password reset',
        'ERROR',
      )
    }
    throw error
  }
}

export const resetPassword = async (
  resetToken: string,
  newPassword: string,
): Promise<boolean> => {
  try {
    const user = await User.findOne({
      where: {
        reset_token: resetToken,
        reset_token_expiration: { [Op.gt]: new Date() },
      },
    })

    if (!user) {
      await AuditLogger.logAction(
        'AuthService',
        `Invalid or expired password reset token used: ${resetToken}`,
        'WARNING',
      )
      return false
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)
    user.password = hashedPassword
    user.reset_token = null
    user.reset_token_expiration = null
    await user.save()

    await AuditLogger.logAction(
      'AuthService',
      `Password reset successfully for user: ${user.user_id}`,
      'INFO',
      user.user_id,
    )

    return true
  } catch (error) {
    if (error instanceof Error) {
      await AuditLogger.logAction(
        'AuthService',
        `Error resetting password: ${error.message}`,
        'ERROR',
      )
    } else {
      await AuditLogger.logAction(
        'AuthService',
        'Unknown error resetting password',
        'ERROR',
      )
    }
    throw error
  }
}

// TODO: Fix Rescue any
export const createUser = async (
  userData: Omit<UserCreationAttributes, 'user_id'>,
  rescueData?: Partial<RescueCreationAttributes>,
): Promise<{ user: User; rescue?: any; staffMember?: StaffMember }> => {
  try {
    const verificationToken = crypto.randomBytes(32).toString('hex')

    const completeUserData: UserCreationAttributes = {
      ...userData,
      email_verified: false,
      verification_token: verificationToken,
      reset_token: null,
      reset_token_expiration: null,
      reset_token_force_flag: undefined,
      country: userData.country ?? undefined,
      city: userData.city ?? undefined,
      location: userData.location ?? undefined,
      password: await bcrypt.hash(userData.password, 10),
    }

    const user = await User.create(completeUserData)
    await sendVerificationEmail(user.email, verificationToken)

    const userRole = await Role.findOne({ where: { role_name: 'user' } })
    if (userRole) {
      await user.addRole(userRole)
    }

    if (rescueData) {
      const completeRescueData: RescueCreationAttributes = {
        ...rescueData,
        reference_number_verified: false,
        address_line_1: '',
        address_line_2: '',
        county: '',
        postcode: '',
        location: rescueData.location ?? undefined,
      }

      const rescue = await RescueModel.create(completeRescueData)

      const staffMember = await StaffMember.create({
        user_id: user.user_id,
        rescue_id: rescue.rescue_id,
        verified_by_rescue: true,
      })

      const roleNames = [
        'staff',
        'rescue_manager',
        'staff_manager',
        'pet_manager',
        'communications_manager',
        'application_manager',
      ]

      const roles = await Role.findAll({
        where: {
          role_name: roleNames,
        },
      })

      for (const role of roles) {
        await user.addRole(role)
      }

      await AuditLogger.logAction(
        'UserService',
        `User and rescue created: ${user.user_id}, ${rescue.rescue_id}`,
        'INFO',
        user.user_id,
      )

      return { user, rescue, staffMember }
    }

    await AuditLogger.logAction(
      'UserService',
      `User created: ${user.user_id}`,
      'INFO',
      user.user_id,
    )

    return { user }
  } catch (error) {
    if (error instanceof Error) {
      await AuditLogger.logAction(
        'UserService',
        `Error creating user: ${error.message}`,
        'ERROR',
      )
    } else {
      await AuditLogger.logAction(
        'UserService',
        'Unknown error creating user',
        'ERROR',
      )
    }
    throw error
  }
}

export const verifyEmailToken = async (token: string): Promise<User | null> => {
  try {
    const user = await User.findOne({ where: { verification_token: token } })

    if (!user) {
      await AuditLogger.logAction(
        'AuthService',
        `Invalid or expired email verification token: ${token}`,
        'WARNING',
      )
      throw new Error('Invalid or expired verification token')
    }

    user.email_verified = true
    user.verification_token = null
    await user.save()

    await AuditLogger.logAction(
      'AuthService',
      `Email verified for user: ${user.user_id}`,
      'INFO',
      user.user_id,
    )

    return user
  } catch (error) {
    if (error instanceof Error) {
      await AuditLogger.logAction(
        'AuthService',
        `Error verifying email: ${error.message}`,
        'ERROR',
      )
    } else {
      await AuditLogger.logAction(
        'AuthService',
        'Unknown error verifying email',
        'ERROR',
      )
    }
    throw error
  }
}

export const completeAccountSetupService = async (
  token: string,
  password: string,
) => {
  // Verify token
  const secretKey = process.env.SECRET_KEY as string
  if (!secretKey) {
    await AuditLogger.logAction(
      'AuthService',
      'Missing SECRET_KEY environment variable',
      'ERROR',
    )
    throw new Error('Internal server error')
  }
  const decoded = jwt.verify(token, secretKey) as {
    email: string
    rescue_id: string
  }

  // Find invitation by email and token
  const invitation = await Invitation.findOne({
    where: { email: decoded.email, token },
  })

  if (!invitation) {
    throw new Error('Invalid or expired token')
  }

  // Hash password and create user
  const hashedPassword = await bcrypt.hash(password, 10)
  const user = await User.create({
    email: decoded.email,
    password: hashedPassword,
  })

  // Fetch both "verified_user" and "staff" roles
  const rolesToAdd = await Role.findAll({
    where: { role_name: ['verified_user', 'staff'] },
  })

  // Assign each role to the user
  for (const role of rolesToAdd) {
    await user.addRole(role)
  }

  // Create a StaffMember entry linked to the user and the rescue
  await StaffMember.create({
    user_id: user.user_id,
    rescue_id: decoded.rescue_id,
    verified_by_rescue: false,
  })

  // Attach the user_id to the invitation and mark as used
  await invitation.update({
    user_id: user.user_id,
    used: true,
  })

  return { message: 'Account setup complete', user }
}
