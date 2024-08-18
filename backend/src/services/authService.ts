// src/services/authService.ts
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { User } from '../Models/'

export const loginUser = async (
  email: string,
  password: string,
): Promise<string> => {
  const user = await User.findOne({ where: { email } })
  if (!user) {
    throw new Error('Invalid email or password')
  }

  const isPasswordValid = await bcrypt.compare(password, user.password)
  if (!isPasswordValid) {
    throw new Error('Invalid email or password')
  }

  // Generate JWT token
  const token = jwt.sign(
    { userId: user.user_id },
    process.env.SECRET_KEY as string,
    { expiresIn: '1h' },
  )
  return token
}

export const logoutUser = async (token: string): Promise<void> => {
  // Optionally, blacklist the token or manage the session
  //   await TokenBlacklist.create({ token })
}
