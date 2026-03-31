import React, { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { resolveUploadUrl } from '../../api/assetUrl.js';
import { STUDENT_BASE } from '../../constants/studentRoutes.js';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaArrowLeftLong } from 'react-icons/fa6';
import './ProfilePage.css';

export function ProfilePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const isStudentView = location.pathname.startsWith(STUDENT_BASE);
  const [form, setForm] = useState({
    full_name: '',
    email_id: '',
    phone_number: '',
    alt_phone_number: '',
    dob: '',
    gender: '',
    college_name: '',
    college_address: '',
    course_branch: '',
    year_of_study: '',
    roll_number: '',
    university_reg_no: '',
    domain: '',
    current_address_house: '',
    current_address_street: '',
    current_address_city: '',
    current_address_state: '',
    current_address_pincode: '',
    permanent_address_house: '',
    permanent_address_street: '',
    permanent_address_city: '',
    permanent_address_state: '',
    permanent_address_pincode: '',
    internship_selected: '',
    internship_mode: '',
    internship_start_date: '',
    internship_duration_months: '',
    internship_end_date: '',
    security_question: '',
    security_answer: '',
    profile_photo_url: '',
    id_document_url: ''
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState('');
  const [profilePhotoFile, setProfilePhotoFile] = useState(null);
  const [idDocFile, setIdDocFile] = useState(null);
  const [photoPreviewFailed, setPhotoPreviewFailed] = useState(false);
  const [stats, setStats] = useState({
    activeExams: 0,
    examsCompleted: 0,
    resultsAvailable: 0
  });
  /** When true, show Internship & Domain block (toggled by checkbox; opened automatically if profile already has intern/domain data). */
  const [isIntern, setIsIntern] = useState(false);

  function profileHasInternOrDomain(p) {
    if (!p || typeof p !== 'object') return false;
    return Boolean(
      String(p.internship_selected || '').trim() ||
        String(p.internship_mode || '').trim() ||
        String(p.internship_start_date || '').trim() ||
        String(p.internship_duration_months || '').trim() ||
        String(p.internship_end_date || '').trim() ||
        String(p.domain || '').trim()
    );
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await api.get('/profile/me');
        const p = res.data?.profile || {};
        setForm((prev) => ({ ...prev, ...p, security_answer: '' }));
        setIsIntern(profileHasInternOrDomain(p));
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  useEffect(() => {
    if (!isStudentView) return;
    async function loadStats() {
      try {
        const [resultsRes, examsRes] = await Promise.all([
          api.get('/results/student/exams'),
          api.get(`/exams?email_id=${encodeURIComponent(form.email_id || '')}`)
        ]);
        const completed = (resultsRes.data?.exams || []).length;
        const active = (examsRes.data?.exams || []).length;
        setStats({
          activeExams: active,
          examsCompleted: completed,
          resultsAvailable: completed
        });
      } catch {
        setStats({
          activeExams: 0,
          examsCompleted: 0,
          resultsAvailable: 0
        });
      }
    }
    void loadStats();
  }, [form.email_id, isStudentView]);

  useEffect(() => {
    setPhotoPreviewFailed(false);
  }, [form.profile_photo_url]);

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      const { security_answer, ...rest } = form;
      const body = { ...rest };
      if (security_answer.trim()) {
        body.security_answer = security_answer.trim();
      }
      const res = await api.put('/profile/me', body);
      setMsg(res.data?.success ? 'Profile updated successfully' : 'Update failed');
      if (res.data?.success && res.data?.profile) {
        setForm((prev) => ({ ...prev, ...res.data.profile, security_answer: '' }));
      }
    } catch (err) {
      setMsg(err?.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  }

  async function uploadFiles() {
    if (!profilePhotoFile && !idDocFile) {
      setMsg('Choose at least one file to upload');
      return;
    }
    setUploading(true);
    setMsg('');
    try {
      const fd = new FormData();
      if (profilePhotoFile) fd.append('profile_photo', profilePhotoFile);
      if (idDocFile) fd.append('id_document', idDocFile);
      const res = await api.post('/profile/upload', fd);
      const p = res.data?.profile || {};
      setForm((prev) => ({ ...prev, ...p }));
      setProfilePhotoFile(null);
      setIdDocFile(null);
      setMsg('Files uploaded successfully');
    } catch (err) {
      setMsg(err?.response?.data?.message || err?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={`profile-page ${isStudentView ? 'profile-page-student' : ''}`}>
      <div className="profile-head">
        <div>
          <h2 className="profile-title">{isStudentView ? 'My Profile' : 'Profile'}</h2>
          {isStudentView ? <div className="profile-subtitle">Manage your personal information and see your stats.</div> : null}
        </div>
        {isStudentView ? (
          <button onClick={() => navigate(-1)} className="profile-back-btn" type="button" aria-label="Back">
            <FaArrowLeftLong aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <div className={`profile-layout ${isStudentView ? 'profile-layout-two-col' : ''}`}>
      <form onSubmit={save} className="profile-card">
        {loading ? <div className="profile-loading">Loading profile...</div> : null}
        {isStudentView ? <div className="profile-warning">* indicates mandatory fields required for exam access.</div> : null}

        <div className="profile-block">
          <h3 className="profile-block-title">Personal Details</h3>
          <div className="profile-grid">
            <div className="profile-field"><label>Full Name *</label><input value={form.full_name} onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))} className="profile-input" /></div>
            <div className="profile-field"><label>Email Address</label><input value={form.email_id} disabled className="profile-input profile-input-disabled" /></div>
            <div className="profile-field"><label>Date of Birth *</label><input value={form.dob} onChange={(e) => setForm((p) => ({ ...p, dob: e.target.value }))} type="date" className="profile-input" /></div>
            <div className="profile-field"><label>Gender *</label><select value={form.gender} onChange={(e) => setForm((p) => ({ ...p, gender: e.target.value }))} className="profile-input"><option value="">Select</option><option>Male</option><option>Female</option><option>Other</option></select></div>
            <div className="profile-field"><label>Phone Number *</label><input value={form.phone_number} onChange={(e) => setForm((p) => ({ ...p, phone_number: e.target.value }))} className="profile-input" /></div>
            <div className="profile-field"><label>Alternate Phone (Optional)</label><input value={form.alt_phone_number} onChange={(e) => setForm((p) => ({ ...p, alt_phone_number: e.target.value }))} className="profile-input" /></div>
          </div>
        </div>

        <div className="profile-block">
          <h3 className="profile-block-title">Educational Details</h3>
          <div className="profile-grid">
            <div className="profile-field"><label>College Name *</label><input value={form.college_name} onChange={(e) => setForm((p) => ({ ...p, college_name: e.target.value }))} className="profile-input" /></div>
            <div className="profile-field"><label>Course/Branch *</label><input value={form.course_branch} onChange={(e) => setForm((p) => ({ ...p, course_branch: e.target.value }))} className="profile-input" /></div>
            <div className="profile-field"><label>Year of Study</label><select value={form.year_of_study} onChange={(e) => setForm((p) => ({ ...p, year_of_study: e.target.value }))} className="profile-input"><option value="">Select</option><option>1st Year</option><option>2nd Year</option><option>3rd Year</option><option>4th Year</option><option>Graduated</option></select></div>
            <div className="profile-field"><label>Roll Number/ID</label><input value={form.roll_number} onChange={(e) => setForm((p) => ({ ...p, roll_number: e.target.value }))} className="profile-input" /></div>
          </div>
          <div className="profile-checkline">
            <input
              id="intern-check"
              type="checkbox"
              checked={isIntern}
              onChange={(e) => {
                const on = e.target.checked;
                setIsIntern(on);
                if (on) {
                  setForm((p) => ({
                    ...p,
                    internship_selected: p.internship_selected || 'Web Development'
                  }));
                } else {
                  setForm((p) => ({
                    ...p,
                    domain: '',
                    internship_selected: '',
                    internship_mode: '',
                    internship_start_date: '',
                    internship_duration_months: '',
                    internship_end_date: ''
                  }));
                }
              }}
            />
            <label htmlFor="intern-check">Are you an intern? (Select to choose your exam domain)</label>
          </div>
        </div>

        {isIntern ? (
          <div className="profile-block profile-block-intern">
            <h3 className="profile-block-title">Internship & Domain Details</h3>
            <div className="profile-grid">
              <div className="profile-field"><label>Select Your Exam Domain (Optional)</label><select value={form.domain} onChange={(e) => setForm((p) => ({ ...p, domain: e.target.value }))} className="profile-input"><option value="">Select Domain</option><option>Web Development</option><option>RPA</option><option>Data Science</option><option>Mobile App Development</option></select></div>
              <div className="profile-field"><label>Internship Selected</label><select value={form.internship_selected} onChange={(e) => setForm((p) => ({ ...p, internship_selected: e.target.value }))} className="profile-input"><option value="">Select</option><option>Web Development</option><option>RPA</option><option>Data Science</option><option>Mobile App Development</option></select></div>
              <div className="profile-field"><label>Mode of Internship</label><select value={form.internship_mode} onChange={(e) => setForm((p) => ({ ...p, internship_mode: e.target.value }))} className="profile-input"><option value="">Select</option><option>Online</option><option>Offline</option><option>Hybrid</option></select></div>
              <div className="profile-field"><label>Internship Start Date</label><input value={form.internship_start_date} onChange={(e) => setForm((p) => ({ ...p, internship_start_date: e.target.value }))} type="date" className="profile-input" /></div>
              <div className="profile-field"><label>Internship Duration (Months)</label><select value={form.internship_duration_months} onChange={(e) => setForm((p) => ({ ...p, internship_duration_months: e.target.value }))} className="profile-input"><option value="">Select Duration</option><option>1</option><option>2</option><option>3</option><option>4</option><option>6</option></select></div>
              <div className="profile-field"><label>Internship End Date (Calculated)</label><input value={form.internship_end_date} onChange={(e) => setForm((p) => ({ ...p, internship_end_date: e.target.value }))} type="date" className="profile-input" /></div>
            </div>
          </div>
        ) : null}
        <div className="profile-section profile-top">
          <h3 className="profile-section-title">Password recovery</h3>
          <div className="profile-section-note">
            Used with <strong>Forgot password</strong> on the login page. Set a question and answer here if you did not add them at registration.
          </div>
          <input
            value={form.security_question}
            onChange={(e) => setForm((p) => ({ ...p, security_question: e.target.value }))}
            placeholder="Security question (e.g. City you were born in)"
            className="profile-input profile-input-full profile-input-bottom"
          />
          <input
            value={form.security_answer}
            onChange={(e) => setForm((p) => ({ ...p, security_answer: e.target.value }))}
            placeholder="Security answer — leave blank to keep your current answer unchanged"
            type="password"
            autoComplete="new-password"
            className="profile-input profile-input-full"
          />
        </div>
        <div className="profile-files">
          <h3 className="profile-section-title">Profile Files</h3>
          <p className="profile-files-hint">Images up to 8&nbsp;MB. ID document: image or PDF.</p>
          <div className="profile-grid">
            <div className="profile-file-col">
              <label className="profile-file-label">Profile Photo</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setProfilePhotoFile(e.target.files?.[0] || null)}
              />
              {profilePhotoFile ? (
                <div className="profile-file-picked">Selected: {profilePhotoFile.name}</div>
              ) : null}
              {form.profile_photo_url ? (
                <>
                  <a
                    href={resolveUploadUrl(form.profile_photo_url)}
                    target="_blank"
                    rel="noreferrer"
                    className="profile-file-link"
                  >
                    View uploaded photo
                  </a>
                  {!photoPreviewFailed ? (
                    <img
                      className="profile-photo-preview"
                      src={resolveUploadUrl(form.profile_photo_url)}
                      alt=""
                      onError={() => setPhotoPreviewFailed(true)}
                    />
                  ) : null}
                </>
              ) : null}
            </div>
            <div className="profile-file-col">
              <label className="profile-file-label">ID Document</label>
              <input
                type="file"
                accept="image/*,.pdf,application/pdf"
                onChange={(e) => setIdDocFile(e.target.files?.[0] || null)}
              />
              {idDocFile ? (
                <div className="profile-file-picked">Selected: {idDocFile.name}</div>
              ) : null}
              {form.id_document_url ? (
                <a
                  href={resolveUploadUrl(form.id_document_url)}
                  target="_blank"
                  rel="noreferrer"
                  className="profile-file-link"
                >
                  View uploaded document
                </a>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={() => void uploadFiles()}
            disabled={uploading}
            className="profile-btn profile-btn-teal profile-full profile-top-sm"
          >
            {uploading ? 'Uploading...' : 'Upload Files'}
          </button>
        </div>
        <button type="submit" disabled={saving} className="profile-btn profile-btn-blue profile-full profile-top">
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </form>
      {isStudentView ? (
        <aside className="profile-stats-card">
          <h3 className="profile-stats-title">Exam Stats</h3>
          <div className="profile-stat-box profile-stat-blue">
            <div className="profile-stat-label">Active Exams</div>
            <div className="profile-stat-value">{stats.activeExams}</div>
          </div>
          <div className="profile-stat-box profile-stat-green">
            <div className="profile-stat-label">Exams Completed</div>
            <div className="profile-stat-value">{stats.examsCompleted}</div>
          </div>
          <div className="profile-stat-box profile-stat-orange">
            <div className="profile-stat-label">Results Available</div>
            <div className="profile-stat-value">{stats.resultsAvailable}</div>
          </div>
        </aside>
      ) : null}
      </div>
      {msg ? <div className="profile-msg">{msg}</div> : null}
    </div>
  );
}

