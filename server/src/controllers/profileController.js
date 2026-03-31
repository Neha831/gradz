import { User } from '../models/User.js';
import { profileDirSegmentFromEmail, fixLegacyProfileUploadUrl } from '../utils/profileUploadPath.js';

/** Safe profile shape for API responses — no password hash or security answer. */
export function toPublicProfile(user) {
  if (!user) return {};
  return {
    full_name: user.full_name ?? '',
    email_id: user.email_id ?? '',
    phone_number: user.phone_number ?? '',
    alt_phone_number: user.alt_phone_number ?? '',
    dob: user.dob ?? '',
    gender: user.gender ?? '',
    college_name: user.college_name ?? '',
    college_address: user.college_address ?? '',
    course_branch: user.course_branch ?? '',
    year_of_study: user.year_of_study ?? '',
    roll_number: user.roll_number ?? '',
    university_reg_no: user.university_reg_no ?? '',
    domain: user.domain ?? '',
    current_address_house: user.current_address_house ?? '',
    current_address_street: user.current_address_street ?? '',
    current_address_city: user.current_address_city ?? '',
    current_address_state: user.current_address_state ?? '',
    current_address_pincode: user.current_address_pincode ?? '',
    permanent_address_house: user.permanent_address_house ?? '',
    permanent_address_street: user.permanent_address_street ?? '',
    permanent_address_city: user.permanent_address_city ?? '',
    permanent_address_state: user.permanent_address_state ?? '',
    permanent_address_pincode: user.permanent_address_pincode ?? '',
    internship_selected: user.internship_selected ?? '',
    internship_mode: user.internship_mode ?? '',
    internship_start_date: user.internship_start_date ?? '',
    internship_duration_months: user.internship_duration_months ?? '',
    internship_end_date: user.internship_end_date ?? '',
    security_question: user.security_question || '',
    profile_photo_url: fixLegacyProfileUploadUrl(user.profile_photo_url || '', user.email_id || ''),
    id_document_url: fixLegacyProfileUploadUrl(user.id_document_url || '', user.email_id || '')
  };
}

export async function getMe(req, res) {
  const email = req.user?.email;
  if (!email) return res.status(401).json({ success: false, message: 'Not authenticated' });

  const user = await User.findOne({ email_id: email, role: req.user.role }).lean();
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  return res.json({
    success: true,
    profile: toPublicProfile(user)
  });
}

export async function updateMe(req, res) {
  const email = req.user?.email;
  if (!email) return res.status(401).json({ success: false, message: 'Not authenticated' });

  const payload = req.body || {};
  const allowed = [
    'full_name',
    'phone_number',
    'alt_phone_number',
    'dob',
    'gender',
    'college_name',
    'college_address',
    'course_branch',
    'year_of_study',
    'roll_number',
    'university_reg_no',
    'domain',
    'current_address_house',
    'current_address_street',
    'current_address_city',
    'current_address_state',
    'current_address_pincode',
    'permanent_address_house',
    'permanent_address_street',
    'permanent_address_city',
    'permanent_address_state',
    'permanent_address_pincode',
    'internship_selected',
    'internship_mode',
    'internship_start_date',
    'internship_duration_months',
    'internship_end_date',
    'security_question'
  ];

  const updates = {};
  for (const k of allowed) {
    if (payload[k] !== undefined) updates[k] = String(payload[k]);
  }

  const newAnswer = payload.security_answer !== undefined ? String(payload.security_answer).trim() : '';
  if (newAnswer) {
    updates.security_answer = newAnswer;
  }

  const updated = await User.findOneAndUpdate(
    { email_id: email, role: req.user.role },
    { $set: updates },
    { new: true }
  ).lean();

  if (!updated) return res.status(404).json({ success: false, message: 'User not found' });

  return res.json({ success: true, profile: toPublicProfile(updated) });
}

export async function uploadProfileFiles(req, res) {
  const email = req.user?.email;
  if (!email) return res.status(401).json({ success: false, message: 'Not authenticated' });

  const dirSeg = profileDirSegmentFromEmail(email);
  const set = {};
  if (req.files?.profile_photo?.[0]) {
    set.profile_photo_url = `/uploads/profiles/${dirSeg}/${req.files.profile_photo[0].filename}`;
  }
  if (req.files?.id_document?.[0]) {
    set.id_document_url = `/uploads/profiles/${dirSeg}/${req.files.id_document[0].filename}`;
  }

  if (!Object.keys(set).length) {
    return res.status(400).json({ success: false, message: 'No files uploaded' });
  }

  const updated = await User.findOneAndUpdate(
    { email_id: email, role: req.user.role },
    { $set: set },
    { new: true }
  ).lean();

  if (!updated) return res.status(404).json({ success: false, message: 'User not found' });
  return res.json({ success: true, profile: toPublicProfile(updated) });
}
