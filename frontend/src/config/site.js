// ============================================================================
//  EDIT THIS FILE to change business details shown across the whole website.
//  The values below are PLACEHOLDERS: replace them before going live.
// ============================================================================

export const site = {
  name: 'DevSphere',
  tagline: 'Real estate agent · sale and rent',
  // Used for the page title / canonical links. Set to your real domain when you deploy.
  url: 'https://www.example.com',

  // 10-digit Indian mobile number (no +91, no spaces).
  phone: '8668370092',
  // WhatsApp number, 10 digits. Usually the same as the phone.
  whatsapp: '8668370092',
  email: 'sarthakzaware3010@gmail.com',

  // Shown in the footer and on the contact page.
  rera: 'RERA Reg. No. 8668370092 (replace with your number)',
  address: ['DevSphere Real Estate', 'Shop No. 12, Main Market Road', 'Jaipur, Rajasthan 302001'],
  mapUrl: '', // optional: Google Maps link for "Get directions"

  hours: [
    { days: 'Monday to Saturday', time: '10:00 am to 7:00 pm' },
    { days: 'Sunday', time: 'By appointment' },
  ],
}

export const phoneDisplay = `+91 ${site.phone.slice(0, 5)} ${site.phone.slice(5)}`
export const phoneTel = `tel:+91${site.phone}`
