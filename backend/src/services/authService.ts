// src/services/authService.ts
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { Op } from 'sequelize'
import { v4 as uuidv4 } from 'uuid'
import {
  Rescue,
  RescueCreationAttributes,
  Role,
  StaffMember,
  User,
  UserCreationAttributes,
} from '../Models/'
import { sendPasswordResetEmail, sendVerificationEmail } from './emailService'
import { getRolesForUser } from './permissionService'

export const loginUser = async (
  email: string,
  password: string,
): Promise<{ token: string; user: any }> => {
  const user = await User.scope('withPassword').findOne({
    where: { email },
  })

  if (!user) {
    throw new Error('Invalid email or password')
  }

  const isPasswordValid = await bcrypt.compare(password, user.password)
  if (!isPasswordValid) {
    throw new Error('Invalid email or password')
  }

  // Fetch user roles
  const roles = await getRolesForUser(user.user_id)

  // Ensure SECRET_KEY is defined
  const secretKey = process.env.SECRET_KEY
  if (!secretKey) {
    throw new Error('Internal server error')
  }

  // Generate JWT token
  const token = jwt.sign({ userId: user.user_id, roles }, secretKey, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  })

  // Destructure user object to exclude password
  const { password: _, ...userWithoutPassword } = user.toJSON()

  // Include roles in the user object
  const userWithRoles = {
    ...userWithoutPassword,
    roles,
  }

  return { token, user: userWithRoles }
}

export const updateUserDetails = async (
  userId: string,
  updatedData: Partial<User>,
): Promise<User | null> => {
  const user = await User.findByPk(userId)

  if (!user) {
    throw new Error('User not found')
  }

  // Update the user with the new details
  await user.update(updatedData)

  // Fetch the updated user to return
  return user
}

export const changePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<boolean> => {
  const user = await User.scope('withPassword').findByPk(userId)

  if (!user) {
    throw new Error('User not found')
  }

  // Verify current password
  const isPasswordValid = await bcrypt.compare(currentPassword, user.password)
  if (!isPasswordValid) {
    throw new Error('Current password is incorrect')
  }

  // Validate new password (e.g., length, complexity)
  // if (newPassword.length < 8) {
  //   throw new Error('New password must be at least 8 characters long')
  // }

  // Hash the new password
  const hashedNewPassword = await bcrypt.hash(newPassword, 10)

  // Update the user's password
  user.password = hashedNewPassword
  await user.save()

  return true
}

export const forgotPassword = async (email: string): Promise<boolean> => {
  const user = await User.findOne({ where: { email } })

  if (!user) {
    return false
  }

  const resetToken = uuidv4()
  user.reset_token = resetToken
  user.reset_token_expiration = new Date(Date.now() + 3600000) // 1 hour expiration
  await user.save()

  await sendPasswordResetEmail(user.email, resetToken)

  return true
}

export const resetPassword = async (
  resetToken: string,
  newPassword: string,
): Promise<boolean> => {
  const user = await User.findOne({
    where: {
      reset_token: resetToken,
      reset_token_expiration: { [Op.gt]: new Date() },
    },
  })

  if (!user) {
    return false
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10)
  user.password = hashedPassword
  user.reset_token = null
  user.reset_token_expiration = null
  await user.save()

  return true
}
export const createUser = async (
  userData: Omit<UserCreationAttributes, 'user_id'>,
  rescueData?: Partial<RescueCreationAttributes>,
): Promise<{ user: User; rescue?: Rescue; staffMember?: StaffMember }> => {
  // Generate a verification token
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

  // Send the verification email
  await sendVerificationEmail(user.email, verificationToken)

  // Assign 'user' role to the user
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

    const rescue = await Rescue.create(completeRescueData)

    // Associate user as a staff member of the rescue
    const staffMember = await StaffMember.create({
      user_id: user.user_id,
      rescue_id: rescue.rescue_id,
      verified_by_rescue: true,
    })

    // Assign additional roles
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

    return { user, rescue, staffMember }
  }

  return { user }
}

export const verifyEmailToken = async (token: string): Promise<User | null> => {
  const user = await User.findOne({ where: { verification_token: token } })

  if (!user) {
    throw new Error('Invalid or expired verification token')
  }

  user.email_verified = true
  user.verification_token = null
  await user.save()

  return user
}
