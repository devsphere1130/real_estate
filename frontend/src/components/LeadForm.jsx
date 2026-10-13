import { useId, useState } from 'react'
import { submitLead } from '../api/client'
import { typeLabel } from '../utils/format'
import { leadMessage } from '../utils/whatsapp'
import WhatsAppButton from './WhatsAppButton'

const MOBILE = /^[6-9]\d{9}$/

function normalizePhone(value) {
  let digits = value.replace(/[\s\-().]/g, '')
  if (digits.startsWith('+91')) digits = digits.slice(3)
  else if (digits.startsWith('91') && digits.length === 12) digits = digits.slice(2)
  else if (digits.startsWith('0') && digits.length === 11) digits = digits.slice(1)
  return digits
}

function validate(form) {
  const errors = {}
  if (form.name.trim().length < 2) errors.name = 'Please enter your name.'
  if (!MOBILE.test(normalizePhone(form.phone))) errors.phone = 'Enter a valid 10-digit Indian mobile number.'
  if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) errors.email = 'Enter a valid email address.'
  return errors
}

/**
 * Enquiry form. Pass `listing` on a property page (interest and type are then fixed),
 * or leave it out for the general enquiry form.
 */
export default function LeadForm({ listing, title = 'Send an enquiry' }) {
  const id = useId()
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    interest: listing?.kind === 'rent' ? 'rent' : 'buy',
    property_type: '',
    budget_text: '',
    message: '',
  })
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(null) // snapshot of what was submitted

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }))
    if (errors[field]) setErrors((er) => ({ ...er, [field]: undefined }))
  }

  async function onSubmit(e) {
    e.preventDefault()
    setSubmitError('')
    const found = validate(form)
    setErrors(found)
    if (Object.keys(found).length) {
      document.getElementById(`${id}-${Object.keys(found)[0]}`)?.focus()
      return
    }

    setSending(true)
    try {
      await submitLead({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        interest: form.interest,
        property_type: listing ? listing.property_type : form.property_type || null,
        budget_text: form.budget_text.trim() || null,
        message: form.message.trim() || null,
        listing_id: listing?.id ?? null,
      })
      setSent({ ...form, name: form.name.trim(), phone: normalizePhone(form.phone) })
    } catch (err) {
      if (Object.keys(err.fields || {}).length) setErrors(err.fields)
      setSubmitError(
        err.status === 429
          ? err.message
          : `${err.message} You can also message us directly on WhatsApp.`,
      )
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <div className="lead-form lead-success" role="status">
        <h2 className="form-title">Thank you, {sent.name.split(' ')[0]}!</h2>
        <p>We have received your enquiry and will call you on {sent.phone} soon.</p>
        <p>Want a faster reply? Send the same details on WhatsApp so we get it in two places.</p>
        <WhatsAppButton message={leadMessage(sent, listing)} className="btn-block">
          Send on WhatsApp
        </WhatsAppButton>
        <button
          type="button"
          className="btn btn-ghost btn-block"
          onClick={() => {
            setSent(null)
            setForm((f) => ({ ...f, message: '' }))
          }}
        >
          Send another enquiry
        </button>
      </div>
    )
  }

  const field = (name) => ({
    id: `${id}-${name}`,
    value: form[name],
    onChange: set(name),
    'aria-invalid': errors[name] ? 'true' : undefined,
    'aria-describedby': errors[name] ? `${id}-${name}-error` : undefined,
  })
  const fieldError = (name) =>
    errors[name] && (
      <p className="field-error" id={`${id}-${name}-error`}>
        {errors[name]}
      </p>
    )

  return (
    <form className="lead-form" onSubmit={onSubmit} noValidate>
      <h2 className="form-title">{title}</h2>
      {listing && (
        <p className="form-sub">
          About <strong>{listing.ref_code}</strong>: {listing.title}
        </p>
      )}

      <div className="field">
        <label htmlFor={`${id}-name`}>Your name</label>
        <input type="text" autoComplete="name" maxLength={120} required {...field('name')} />
        {fieldError('name')}
      </div>

      <div className="field">
        <label htmlFor={`${id}-phone`}>Mobile number</label>
        <input type="tel" inputMode="tel" autoComplete="tel" placeholder="10-digit mobile number" required {...field('phone')} />
        {fieldError('phone')}
      </div>

      <div className="field">
        <label htmlFor={`${id}-email`}>
          Email <span className="optional">(optional)</span>
        </label>
        <input type="email" autoComplete="email" maxLength={255} {...field('email')} />
        {fieldError('email')}
      </div>

      {!listing && (
        <>
          <fieldset className="field radio-group">
            <legend>I want to</legend>
            {[
              ['buy', 'Buy'],
              ['rent', 'Rent'],
            ].map(([value, label]) => (
              <label key={value} className="radio">
                <input
                  type="radio"
                  name={`${id}-interest`}
                  value={value}
                  checked={form.interest === value}
                  onChange={set('interest')}
                />
                <span>{label}</span>
              </label>
            ))}
          </fieldset>

          <div className="field-row">
            <div className="field">
              <label htmlFor={`${id}-property_type`}>
                Property type <span className="optional">(optional)</span>
              </label>
              <select {...field('property_type')}>
                <option value="">Any type</option>
                {Object.entries(typeLabel).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor={`${id}-budget_text`}>
                Budget <span className="optional">(optional)</span>
              </label>
              <input type="text" maxLength={100} placeholder="e.g. 60 to 70 Lakh" {...field('budget_text')} />
            </div>
          </div>
        </>
      )}

      <div className="field">
        <label htmlFor={`${id}-message`}>
          Message <span className="optional">(optional)</span>
        </label>
        <textarea
          rows={3}
          maxLength={2000}
          placeholder={listing ? 'Preferred visit day and time, questions…' : 'Tell us what you are looking for'}
          {...field('message')}
        />
        {fieldError('message')}
      </div>

      {submitError && (
        <p className="form-error" role="alert">
          {submitError}
        </p>
      )}

      <button type="submit" className="btn btn-primary btn-block" disabled={sending}>
        {sending ? 'Sending…' : 'Send enquiry'}
      </button>
      <p className="form-note">We only use your number to contact you about properties.</p>
    </form>
  )
}
