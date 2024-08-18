import User from '../Models/User'

interface GetAllUsersParams {
  page?: number
  limit?: number
  sort?: 'asc' | 'desc'
  role?: string
}

export const getAllUsersService = async ({
  page = 1,
  limit = 10,
  sort = 'asc',
  role,
}: GetAllUsersParams) => {
  const offset = (page - 1) * limit
  const whereClause: any = {}

  const { rows, count } = await User.findAndCountAll({
    where: whereClause,
    limit,
    offset,
    order: [['created_at', sort.toUpperCase()]],
  })

  return {
    users: rows,
    pagination: {
      totalItems: count,
      currentPage: page,
      totalPages: Math.ceil(count / limit),
    },
  }
}
