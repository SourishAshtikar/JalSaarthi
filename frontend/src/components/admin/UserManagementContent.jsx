import { useEffect, useMemo, useState } from 'react'
import { Calendar, Edit, MapPin, Shield, Trash2, UserPlus, Users } from 'lucide-react'
import { ApiError, DataTable, Metric, Modal } from '../common/CommonUI'
import SearchableSelect from '../common/SearchableSelect'

export default function UserManagementContent({ request, notify, setError }) {
  const [users, setUsers] = useState([])
  const [districts, setDistricts] = useState([])
  const [villages, setVillages] = useState([])
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null) // null for create, user object for edit
  const [confirmDeleteUser, setConfirmDeleteUser] = useState(null)

  // Form states
  const [role, setRole] = useState('VILLAGE_HEAD')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selectedDistrictId, setSelectedDistrictId] = useState('')
  const [selectedVillageId, setSelectedVillageId] = useState('')

  const loadData = async () => {
    setBusy(true)
    setError('')
    try {
      const [uRes, dRes, vRes] = await Promise.all([
        request('/api/users'),
        request('/api/geography/districts'),
        request('/api/geography/villages')
      ])
      setUsers(uRes.data || [])
      setDistricts(dRes.data || [])
      setVillages(vRes.data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Filter villages by selected district
  const filteredVillages = useMemo(() => {
    if (!selectedDistrictId) return villages
    return villages.filter(v => v.district_id === Number(selectedDistrictId))
  }, [villages, selectedDistrictId])

  // Open modal for Create
  const handleAddClick = () => {
    setSelectedUser(null)
    setRole('VILLAGE_HEAD')
    setName('')
    setEmail('')
    setPassword('')
    setSelectedDistrictId('')
    setSelectedVillageId('')
    setModalOpen(true)
  }

  // Open modal for Edit
  const handleEditClick = (user) => {
    setSelectedUser(user)
    setRole(user.role)
    setName(user.name)
    setEmail(user.email)
    setPassword('')
    setSelectedDistrictId(user.district_id || '')
    setSelectedVillageId(user.village_id || '')
    setModalOpen(true)
  }

  // Handle Form Submit
  const handleFormSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const payload = {
      name,
      email,
      role,
      district_id: (role === 'AUDITOR' || role === 'ADMIN') && selectedDistrictId ? Number(selectedDistrictId) : null,
      village_id: role === 'VILLAGE_HEAD' && selectedVillageId ? Number(selectedVillageId) : null
    }

    if (role === 'AUDITOR' && !payload.district_id) {
      setError('Geographic District Assignment is required for Auditors')
      return
    }
    if (role === 'VILLAGE_HEAD' && !payload.village_id) {
      setError('Geographic Village Assignment is required for Sarpanches')
      return
    }

    if (password.trim() || !selectedUser) {
      payload.password = password
    }

    try {
      if (selectedUser) {
        // Edit User
        await request(`/api/users/${selectedUser.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        })
        notify('User updated successfully')
      } else {
        // Create User
        await request('/api/users', {
          method: 'POST',
          body: JSON.stringify(payload)
        })
        notify('User created successfully')
      }
      setModalOpen(false)
      loadData()
    } catch (err) {
      setError(err.message)
    }
  }

  // Handle Delete User
  const handleDeleteConfirm = async () => {
    if (!confirmDeleteUser) return
    setError('')
    try {
      await request(`/api/users/${confirmDeleteUser.id}`, {
        method: 'DELETE'
      })
      notify('User deleted successfully')
      setConfirmDeleteUser(null)
      loadData()
    } catch (err) {
      setError(err.message)
    }
  }

  // Search & filter users list
  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return users
    return users.filter(u =>
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().replaceAll('_', ' ').includes(q) ||
      (u.district_name && u.district_name.toLowerCase().includes(q)) ||
      (u.village_name && u.village_name.toLowerCase().includes(q))
    )
  }, [users, search])

  // Count summaries for metrics
  const counts = useMemo(() => {
    return users.reduce((acc, u) => {
      acc.total++
      if (u.role === 'VILLAGE_HEAD') acc.villageHeads++
      if (u.role === 'AUDITOR') acc.auditors++
      return acc
    }, { total: 0, villageHeads: 0, auditors: 0 })
  }, [users])

  const headers = ['User Details', 'Role', 'Assigned District', 'Assigned Village', 'Created At', 'Actions']

  const rows = filteredUsers.map(u => {
    const roleLabel = u.role === 'VILLAGE_HEAD' ? 'SARPANCH' : u.role.replaceAll('_', ' ')
    const roleClass = u.role === 'ADMIN' ? 'status warn' : u.role === 'AUDITOR' ? 'status good' : u.role === 'VILLAGE_HEAD' ? 'status brand' : 'status info'
    
    return [
      <div>
        <strong>{u.name}</strong>
        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{u.email}</div>
      </div>,
      <span className={roleClass} style={{ textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600 }}>{roleLabel}</span>,
      u.district_name || <span className="muted">—</span>,
      u.village_name || <span className="muted">—</span>,
      new Date(u.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }),
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          className="button small"
          onClick={() => handleEditClick(u)}
          title="Edit User Assignment"
        >
          <Edit size={14} />
          <span>Edit</span>
        </button>
        <button
          className="button small secondary error"
          onClick={() => setConfirmDeleteUser(u)}
          title="Delete User"
        >
          <Trash2 size={14} />
          <span>Delete</span>
        </button>
      </div>
    ]
  })

  return (
    <>
      <div className="welcome-banner">
        <h1>System Administration</h1>
        <p>Manage authenticated platform users and assign their geographic permissions (districts and villages).</p>
      </div>

      <section className="summary">
        <Metric icon={<Users />} label="Total Users" value={counts.total} />
        <Metric icon={<Shield />} label="Auditors" value={counts.auditors} />
        <Metric icon={<MapPin />} label="Sarpanches" value={counts.villageHeads} />
      </section>

      <section className="toolbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
          <input
            type="text"
            placeholder="Search users by name, email, role or location..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', maxSelf: 'stretch', minWidth: '280px', padding: '9px 12px', fontSize: '0.88rem' }}
          />
        </div>

        <button className="button primary" onClick={handleAddClick}>
          <UserPlus size={16} />
          <span>Add User</span>
        </button>
      </section>

      <DataTable
        headers={headers}
        rows={rows}
        empty={busy ? 'Loading User Directory…' : 'No users match your query.'}
      />

      {/* Create / Edit User Modal */}
      {modalOpen && (
        <Modal
          title={selectedUser ? 'Edit User Assignment' : 'Add New User'}
          onClose={() => setModalOpen(false)}
        >
          <form className="stack" onSubmit={handleFormSubmit} style={{ padding: '16px 20px' }}>
            <label>
              Full Name
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Enter user name..."
                required
              />
            </label>

            <label>
              Email Address
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="user@example.com"
                required
              />
            </label>

            <label>
              Password {selectedUser && <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#64748b' }}>(Leave blank to keep current)</span>}
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={selectedUser ? "Enter new password..." : "Enter minimum 6 characters..."}
                required={!selectedUser}
                minLength={selectedUser ? undefined : 6}
              />
            </label>

            <label>
              System Role
              <select value={role} onChange={e => {
                setRole(e.target.value)
                setSelectedDistrictId('')
                setSelectedVillageId('')
              }}>
                <option value="VILLAGE_HEAD">Sarpanch</option>
                <option value="AUDITOR">District Auditor</option>
                <option value="ADMIN">Administrator</option>
              </select>
            </label>

            {/* District Assignment Dropdown (shown for AUDITOR, ADMIN) */}
            {(role === 'AUDITOR' || role === 'ADMIN') && (
              <SearchableSelect
                label="Geographic District Assignment"
                placeholder="Select district..."
                value={selectedDistrictId}
                onChange={(val) => {
                  setSelectedDistrictId(val)
                  setSelectedVillageId('') // Reset village if district changes
                }}
                options={districts}
              />
            )}

            {/* Village Assignment Dropdown (shown for VILLAGE_HEAD) */}
            {role === 'VILLAGE_HEAD' && (
              <SearchableSelect
                label="Geographic Village Assignment"
                placeholder="Select village..."
                value={selectedVillageId}
                onChange={(val) => setSelectedVillageId(val)}
                options={filteredVillages}
              />
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button type="button" className="button secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="button primary">
                {selectedUser ? 'Save Changes' : 'Create User'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteUser && (
        <Modal
          title="Confirm User Deletion"
          onClose={() => setConfirmDeleteUser(null)}
        >
          <div style={{ padding: '16px 20px' }}>
            <p>
              Are you sure you want to delete the user account for <strong>{confirmDeleteUser.name}</strong> (<code>{confirmDeleteUser.email}</code>)?
            </p>
            <p style={{ color: '#9e3322', fontSize: '0.88rem', marginTop: '6px' }}>
              <strong>Caution:</strong> This action is permanent. All geographic assignments for this user will be removed.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button className="button secondary" onClick={() => setConfirmDeleteUser(null)}>
                Cancel
              </button>
              <button className="button primary error" onClick={handleDeleteConfirm}>
                Delete User Account
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
