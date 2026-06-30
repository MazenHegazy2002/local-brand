'use client';

import { useState, useEffect } from 'react';
import { useConfirm } from '@/providers/ConfirmProvider';

export default function AdminUsersPage() {
  const { confirm } = useConfirm();
  const [users, setUsers] = useState<any[]>([]);
  const [_loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, roleFilter, page]);

  const fetchUsers = async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), search, role: roleFilter });
    const res = await fetch(`/api/admin/users?${params}`);
    const data = await res.json();
    setUsers(data.users || []);
    setTotalPages(data.totalPages || 1);
    setLoading(false);
  };

  const suspendUser = async (id: string) => {
    await fetch(`/api/admin/users/${id}/suspend`, { method: 'POST' });
    fetchUsers();
  };

  const deleteUser = async (id: string) => {
    const confirmed = await confirm({
      title: 'Delete User',
      message: 'Delete this user? This cannot be undone.',
      type: 'danger',
    });
    if (!confirmed) return;
    await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
    fetchUsers();
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">User Management</h1>
        <button className="bg-primary text-white px-4 py-2 rounded-lg">Export CSV</button>
      </div>

      <div className="bg-white rounded-xl p-4 mb-6 flex gap-4">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 border rounded-lg px-4 py-2"
        />
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="border rounded-lg px-4 py-2"
        >
          <option value="">All Roles</option>
          <option value="BUYER">Buyer</option>
          <option value="SELLER">Seller</option>
          <option value="ADMIN">Admin</option>
        </select>
      </div>

      <div className="bg-white rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">User</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Role</th>
              <th className="px-4 py-3 text-left">Joined</th>
              <th className="px-4 py-3 text-left">Orders</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className="border-t">
                <td className="px-4 py-3">{user.name}</td>
                <td className="px-4 py-3">{user.email}</td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      user.role === 'ADMIN'
                        ? 'bg-red-100 text-red-700'
                        : user.role === 'SELLER'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-3">{new Date(user.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3">{user._count?.orders || 0}</td>
                <td className="px-4 py-3 flex gap-2">
                  <button onClick={() => suspendUser(user.id)} className="text-yellow-600 text-sm">
                    Suspend
                  </button>
                  <button onClick={() => deleteUser(user.id)} className="text-red-600 text-sm">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-center gap-2 mt-6">
        <button
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
          className="px-4 py-2 border rounded disabled:opacity-50"
        >
          Prev
        </button>
        <span className="px-4 py-2">
          Page {page} of {totalPages}
        </span>
        <button
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
          className="px-4 py-2 border rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
