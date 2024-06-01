import React from 'react';
import PaginationControls from '../common/PaginationControls';
import { User } from '../../types/user';

interface UsersTableProps {
  currentUsers: User[];
  onResetPassword: (userId: string) => void;
  onDeleteUser: (userId: string) => void;
  currentPage: number;
  totalPages: number;
  onChangePage: (page: number) => void;
}

const UsersTable: React.FC<UsersTableProps> = ({
  currentUsers,
  onResetPassword,
  onDeleteUser,
  currentPage,
  totalPages,
  onChangePage,
}) => {
  return (
    <>
      <div className='overflow-x-auto'>
        <table className='table-auto w-full'>
          <thead>
            <tr>
              <th className='border px-4 py-2'>User ID</th>
              <th className='border px-4 py-2'>First name</th>
              <th className='border px-4 py-2'>Last name</th>
              <th className='border px-4 py-2'>Email</th>
              <th className='border px-4 py-2'>City</th>
              <th className='border px-4 py-2'>Country</th>
              <th className='border px-4 py-2'>Flags</th>
              <th className='border px-4 py-2'>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentUsers.map((user) => (
              <tr key={user.userId} className='hover:bg-gray-100'>
                <td className='border px-4 py-2'>{user.userId}</td>
                <td className='border px-4 py-2'>{user.firstName}</td>
                <td className='border px-4 py-2'>{user.lastName}</td>
                <td className='border px-4 py-2'>{user.email}</td>
                <td className='border px-4 py-2'>{user.city || ''}</td>
                <td className='border px-4 py-2'>{user.country || ''}</td>
                <td className='border px-4 py-2'>
                  {user.resetTokenForceFlag && (
                    <span className='bg-blue-500 text-white font-bold py-1 px-2 rounded mr-2'>
                      Force Reset Flag
                    </span>
                  )}
                  {user.isAdmin && (
                    <span className='bg-blue-500 text-white font-bold py-1 px-2 rounded'>
                      Admin
                    </span>
                  )}
                </td>
                <td className='border px-4 py-2'>
                  <button
                    className='bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded mr-2'
                    onClick={() => onResetPassword(user.userId!)}
                  >
                    Reset Password
                  </button>
                  <button
                    className='bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded'
                    onClick={() => onDeleteUser(user.userId!)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        onChangePage={onChangePage}
      />
    </>
  );
};

export default UsersTable;
