import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaFileExcel, FaPenToSquare, FaSquarePlus, FaTrash } from 'react-icons/fa6';
import { api } from '../../api/client.js';
import { adminRoute } from '../../constants/adminRoutes.js';
import './StudentsManagementPage.css';

function truncateHash(s, max = 36) {
  if (!s) return '—';
  const t = String(s);
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

export function StudentsManagementPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState('');
  const [editingId, setEditingId] = useState('');
  const [editForm, setEditForm] = useState({
    full_name: '',
    phone_number: '',
    security_question: '',
    security_answer: ''
  });

  async function load() {
    setLoading(true);
    setMsg('');
    try {
      const res = await api.get('/users?role=student');
      setRows(res.data?.users || []);
    } catch (err) {
      setMsg(err?.response?.data?.message || 'Failed to load students');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function startEdit(s) {
    setEditingId(s._id);
    setEditForm({
      full_name: s.full_name || '',
      phone_number: s.phone_number || '',
      security_question: s.security_question || '',
      security_answer: ''
    });
  }

  async function saveEdit() {
    if (!editingId) return;
    try {
      const payload = {
        full_name: editForm.full_name,
        phone_number: editForm.phone_number,
        security_question: editForm.security_question
      };
      if (editForm.security_answer.trim()) {
        payload.security_answer = editForm.security_answer.trim();
      }
      const res = await api.put(`/users/${editingId}`, payload);
      setMsg(res.data?.message || 'Student updated');
      setEditingId('');
      await load();
    } catch (err) {
      setMsg(err?.response?.data?.message || 'Failed to update student');
    }
  }

  async function removeStudent(id) {
    if (pendingDeleteId !== id) {
      setPendingDeleteId(id);
      setMsg('Click Delete again on the same student to confirm removal.');
      return;
    }
    try {
      const res = await api.delete(`/users/${id}`);
      setMsg(res.data?.message || 'Student deleted');
      setPendingDeleteId('');
      await load();
    } catch (err) {
      setMsg(err?.response?.data?.message || 'Failed to delete student');
    }
  }

  async function exportExcel() {
    try {
      const res = await api.get('/users/export-xlsx', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'students_export.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setMsg('Failed to export Excel file');
    }
  }

  return (
    <div className="students-mgmt-page">
      <div className="students-mgmt-top">
        <h1 className="students-mgmt-title">Manage Students</h1>
        <button type="button" className="students-mgmt-back-hub" onClick={() => navigate(adminRoute('students'))}>
          Back to Students
        </button>
      </div>

      <div className="students-mgmt-toolbar">
        <Link to={adminRoute('students/add')} className="students-mgmt-btn students-mgmt-btn-create">
          <FaSquarePlus aria-hidden="true" />
          Create Student
        </Link>
        <button type="button" onClick={() => void exportExcel()} className="students-mgmt-btn students-mgmt-btn-excel">
          <FaFileExcel aria-hidden="true" />
          Export to Excel
        </button>
      </div>

      {msg ? <div className="students-mgmt-msg">{msg}</div> : null}
      {loading ? <div className="students-mgmt-loading">Loading students…</div> : null}

      <div className="students-mgmt-table-wrap">
        <table className="students-mgmt-table">
          <thead>
            <tr>
              <th>Full Name</th>
              <th>Email ID</th>
              <th>Mobile Number</th>
              <th>Security Question</th>
              <th>Security Answer</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => {
              const isEditing = editingId === s._id;
              return (
                <tr key={s._id}>
                  <td>
                    {isEditing ? (
                      <input
                        value={editForm.full_name}
                        onChange={(e) => setEditForm((p) => ({ ...p, full_name: e.target.value }))}
                        className="students-mgmt-cell-input"
                      />
                    ) : (
                      s.full_name || '—'
                    )}
                  </td>
                  <td className="students-mgmt-email">{s.email_id}</td>
                  <td>
                    {isEditing ? (
                      <input
                        value={editForm.phone_number}
                        onChange={(e) => setEditForm((p) => ({ ...p, phone_number: e.target.value }))}
                        className="students-mgmt-cell-input"
                      />
                    ) : (
                      s.phone_number || '—'
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input
                        value={editForm.security_question}
                        onChange={(e) => setEditForm((p) => ({ ...p, security_question: e.target.value }))}
                        className="students-mgmt-cell-input"
                      />
                    ) : (
                      s.security_question || '—'
                    )}
                  </td>
                  <td className="students-mgmt-hash" title={s.security_answer || ''}>
                    {isEditing ? (
                      <input
                        value={editForm.security_answer}
                        onChange={(e) => setEditForm((p) => ({ ...p, security_answer: e.target.value }))}
                        placeholder="New answer (optional)"
                        className="students-mgmt-cell-input"
                        autoComplete="off"
                      />
                    ) : (
                      truncateHash(s.security_answer)
                    )}
                  </td>
                  <td className="students-mgmt-nowrap">
                    {isEditing ? (
                      <>
                        <button type="button" onClick={() => void saveEdit()} className="students-mgmt-action students-mgmt-action-save">
                          Save
                        </button>
                        <button type="button" onClick={() => setEditingId('')} className="students-mgmt-action students-mgmt-action-cancel">
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button type="button" onClick={() => startEdit(s)} className="students-mgmt-action students-mgmt-action-edit">
                          <FaPenToSquare aria-hidden="true" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void removeStudent(s._id)}
                          className={
                            pendingDeleteId === s._id
                              ? 'students-mgmt-action students-mgmt-action-delete students-mgmt-action-delete-confirm'
                              : 'students-mgmt-action students-mgmt-action-delete'
                          }
                        >
                          <FaTrash aria-hidden="true" />
                          {pendingDeleteId === s._id ? 'Confirm' : 'Delete'}
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
            {!rows.length && !loading ? (
              <tr>
                <td colSpan={6} className="students-mgmt-empty">
                  No students found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
