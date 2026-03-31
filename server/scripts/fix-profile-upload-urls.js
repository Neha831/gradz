/**
 * One-time: rewrite profile_photo_url / id_document_url in MongoDB from legacy
 * encodeURIComponent(email) paths to profileDirSegmentFromEmail paths (matches disk).
 *
 * Run from server/:  npm run fix:profile-upload-urls
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { fixLegacyProfileUploadUrl } from '../src/utils/profileUploadPath.js';
import { User } from '../src/models/User.js';

dotenv.config();

async function run() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    // eslint-disable-next-line no-console
    console.error('Missing MONGO_URI in .env');
    process.exit(1);
  }

  await mongoose.connect(uri);
  const users = await User.find({
    $or: [{ profile_photo_url: { $nin: ['', null] } }, { id_document_url: { $nin: ['', null] } }]
  })
    .select('email_id profile_photo_url id_document_url')
    .lean();

  let updated = 0;
  for (const u of users) {
    const email = u.email_id || '';
    const nextPhoto = fixLegacyProfileUploadUrl(u.profile_photo_url || '', email);
    const nextDoc = fixLegacyProfileUploadUrl(u.id_document_url || '', email);
    if (nextPhoto === (u.profile_photo_url || '') && nextDoc === (u.id_document_url || '')) continue;
    await User.updateOne(
      { _id: u._id },
      { $set: { profile_photo_url: nextPhoto, id_document_url: nextDoc } }
    );
    updated += 1;
  }

  // eslint-disable-next-line no-console
  console.log(`Scanned ${users.length} user(s) with file URLs; updated ${updated}.`);
  await mongoose.disconnect();
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
