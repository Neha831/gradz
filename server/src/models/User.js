import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ['admin', 'student'], required: true, index: true },
    email_id: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },

    // Common profile fields
    full_name: { type: String, default: '' },
    college_name: { type: String, default: '' },
    phone_number: { type: String, default: '' },
    course_branch: { type: String, default: '' },

    domain: { type: String, default: '' }, // used by student exam filtering

    // Extended profile fields from legacy get_profile.php mapping
    alt_phone_number: { type: String, default: '' },
    dob: { type: String, default: '' },
    gender: { type: String, default: '' },
    current_address_house: { type: String, default: '' },
    current_address_street: { type: String, default: '' },
    current_address_city: { type: String, default: '' },
    current_address_state: { type: String, default: '' },
    current_address_pincode: { type: String, default: '' },
    permanent_address_house: { type: String, default: '' },
    permanent_address_street: { type: String, default: '' },
    permanent_address_city: { type: String, default: '' },
    permanent_address_state: { type: String, default: '' },
    permanent_address_pincode: { type: String, default: '' },
    college_address: { type: String, default: '' },
    year_of_study: { type: String, default: '' },
    roll_number: { type: String, default: '' },
    university_reg_no: { type: String, default: '' },
    internship_selected: { type: String, default: '' },
    internship_mode: { type: String, default: '' },
    internship_start_date: { type: String, default: '' },
    internship_duration_months: { type: String, default: '' },
    internship_end_date: { type: String, default: '' },

    // Uploaded files
    profile_photo_url: { type: String, default: '' },
    id_document_url: { type: String, default: '' },

    // Legacy password recovery fields
    security_question: { type: String, default: '' },
    security_answer: { type: String, default: '' }
  },
  { timestamps: true }
);

export const User = mongoose.models.User ?? mongoose.model('User', UserSchema);

