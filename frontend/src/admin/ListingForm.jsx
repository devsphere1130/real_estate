import { useEffect, useId, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError, assetUrl } from '../api/client'
import { ErrorBox, Loading } from '../components/States'
import { useFetch } from '../hooks/useFetch'
import { formatPrice, typeLabel } from '../utils/format'
import { useSeo } from '../utils/seo'
import { adminApi } from './adminApi'
import { prepareImage } from './compressImage'
import ConfirmDialog from './ConfirmDialog'
import PhotoGrid from './PhotoGrid'
import { useToast } from './Toast'

const FACING = ['North', 'South', 'East', 'West', 'North-East', 'North-West', 'South-East', 'South-West']
const FURNISHING = ['unfurnished', 'semi-furnished', 'furnished']
const AMENITY_SUGGESTIONS = ['Lift', 'Parking', 'Power backup', '24x7 water', 'Security', 'CCTV', 'Gym', 'Garden', 'Club house', 'Swimming pool']
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_ORIGINAL_MB = 40 // big phone photos are fine: they are shrunk in the browser before upload
const MAX_PHOTOS = 20

const EMPTY = {
  title: '',
  kind: 'sale',
  property_type: 'flat',
  locality: '',
  city: '',
  price: '',
  carpet_area_sqft: '',
  bedrooms: '',
  floor: '',
  total_floors: '',
  age_years: '',
  facing: '',
  furnishing: '',
  status: 'available',
  description: '',
  is_featured: false,
}

const show = (type) => ({
  bedrooms: type === 'flat' || type === 'villa' || type === 'room',
  floors: type !== 'plot',
  furnishing: type !== 'plot',
  age: type !== 'plot',
})

function fromListing(l) {
  const f = { ...EMPTY }
  for (const key of Object.keys(EMPTY)) {
    const v = l[key]
    f[key] = v === null || v === undefined ? '' : key === 'is_featured' ? !!v : v
  }
  return f
}

const toInt = (v) => (v === '' || v === null ? null : Number(v))
const isInt = (v) => /^-?\d+$/.test(String(v))

function validate(form) {
  const e = {}
  const vis = show(form.property_type)
  if (form.title.trim().length < 3) e.title = 'Enter a title of at least 3 characters.'
  if (!form.locality.trim()) e.locality = 'Enter the locality.'
  if (!form.city.trim()) e.city = 'Enter the city.'
  if (!isInt(form.price) || Number(form.price) <= 0) e.price = 'Enter the price in rupees (a whole number above 0).'
  if (!isInt(form.carpet_area_sqft) || Number(form.carpet_area_sqft) <= 0) e.carpet_area_sqft = 'Enter the carpet area in sq ft.'
  if (vis.bedrooms && form.bedrooms !== '' && (!isInt(form.bedrooms) || form.bedrooms < 0 || form.bedrooms > 20)) e.bedrooms = 'Enter 0 to 20.'
  if (vis.floors) {
    if (form.floor !== '' && (!isInt(form.floor) || form.floor < -2 || form.floor > 200)) e.floor = 'Enter a floor number (0 = ground).'
    if (form.total_floors !== '' && (!isInt(form.total_floors) || form.total_floors < 0 || form.total_floors > 200)) e.total_floors = 'Enter 0 to 200.'
    if (!e.floor && !e.total_floors && form.floor !== '' && form.total_floors !== '' && Number(form.floor) > Number(form.total_floors)) {
      e.floor = 'Floor cannot be higher than total floors.'
    }
  }
  if (vis.age && form.age_years !== '' && (!isInt(form.age_years) || form.age_years < 0 || form.age_years > 200)) e.age_years = 'Enter the age in years.'
  if (form.status === 'sold' && form.kind !== 'sale') e.status = 'Only a property for sale can be marked sold.'
  if (form.status === 'rented' && form.kind !== 'rent') e.status = 'Only a property for rent can be marked rented.'
  return e
}

function buildPayload(form, amenities) {
  const vis = show(form.property_type)
  return {
    title: form.title.trim(),
    kind: form.kind,
    property_type: form.property_type,
    locality: form.locality.trim(),
    city: form.city.trim(),
    price: Number(form.price),
    carpet_area_sqft: Number(form.carpet_area_sqft),
    bedrooms: vis.bedrooms ? toInt(form.bedrooms) : null,
    floor: vis.floors ? toInt(form.floor) : null,
    total_floors: vis.floors ? toInt(form.total_floors) : null,
    age_years: vis.age ? toInt(form.age_years) : null,
    facing: form.facing || null,
    furnishing: vis.furnishing ? form.furnishing || null : null,
    status: form.status,
    description: form.description.trim() || null,
    amenities,
    is_featured: form.is_featured,
  }
}

function checkFiles(fileList, existingCount) {
  const ok = []
  const problems = []
  for (const file of Array.from(fileList)) {
    if (!ALLOWED_TYPES.includes(file.type)) problems.push(`${file.name}: only jpg, png and webp images are allowed.`)
    else if (file.size > MAX_ORIGINAL_MB * 1024 * 1024) problems.push(`${file.name}: larger than ${MAX_ORIGINAL_MB} MB.`)
    else if (existingCount + ok.length >= MAX_PHOTOS) problems.push(`${file.name}: a property can have at most ${MAX_PHOTOS} photos.`)
    else ok.push(file)
  }
  return { ok, problems }
}

function FormBody({ listing }) {
  const isEdit = !!listing
  const uid = useId()
  const navigate = useNavigate()
  const notify = useToast()
  useSeo({ title: isEdit ? `Edit ${listing.ref_code}` : 'Add property' })

  const [form, setForm] = useState(() => (listing ? fromListing(listing) : EMPTY))
  const [amenities, setAmenities] = useState(listing?.amenities ?? [])
  const [amenityText, setAmenityText] = useState('')
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const [photos, setPhotos] = useState(listing?.photos ?? []) // saved photos (edit mode)
  const [pending, setPending] = useState([]) // chosen files not yet uploaded (add mode)
  const [photoProblems, setPhotoProblems] = useState([])
  const [photoBusy, setPhotoBusy] = useState(false)
  const [photoStatus, setPhotoStatus] = useState('')
  const [photoToRemove, setPhotoToRemove] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const pendingRef = useRef(pending)
  pendingRef.current = pending

  useEffect(() => () => pendingRef.current.forEach((p) => URL.revokeObjectURL(p.url)), [])

  const vis = show(form.property_type)
  const id = (name) => `${uid}-${name}`

  const set = (name) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((f) => {
      const next = { ...f, [name]: value }
      if (name === 'kind' && ((value === 'rent' && f.status === 'sold') || (value === 'sale' && f.status === 'rented'))) next.status = 'available'
      return next
    })
    if (errors[name]) setErrors((er) => ({ ...er, [name]: undefined }))
  }
  const bind = (name) => ({
    id: id(name),
    value: form[name],
    onChange: set(name),
    'aria-invalid': errors[name] ? 'true' : undefined,
    'aria-describedby': errors[name] ? id(`${name}-error`) : undefined,
  })
  const fieldError = (name) =>
    errors[name] && (
      <p className="field-error" id={id(`${name}-error`)}>
        {errors[name]}
      </p>
    )

  // ----- amenities -----
  function addAmenity(text) {
    const value = text.trim().slice(0, 50)
    if (!value) return
    if (amenities.some((a) => a.toLowerCase() === value.toLowerCase())) return
    if (amenities.length >= 30) return
    setAmenities([...amenities, value])
    setAmenityText('')
  }

  // ----- photos -----
  async function addFiles(fileList) {
    const { ok, problems } = checkFiles(fileList, isEdit ? photos.length : pending.length)
    setPhotoProblems(problems)
    if (ok.length === 0) return

    setPhotoBusy(true)
    setPhotoStatus('Preparing photos…')
    try {
      // Big phone photos are shrunk first: one request to the server must stay under ~4.5 MB.
      const ready = []
      for (const file of ok) ready.push(await prepareImage(file))

      if (isEdit) {
        // One photo per request, so a single bad or slow photo cannot spoil the rest.
        const failed = []
        let uploaded = 0
        for (let i = 0; i < ready.length; i++) {
          setPhotoStatus(`Uploading ${i + 1} of ${ready.length}…`)
          try {
            const updated = await adminApi.uploadPhotos(listing.id, [ready[i]])
            setPhotos(updated.photos)
            uploaded++
          } catch (err) {
            failed.push(`${ok[i].name}: ${err.message}`)
            if (err.status === 401) break
          }
        }
        if (uploaded) notify(`${uploaded} ${uploaded === 1 ? 'photo' : 'photos'} uploaded.`)
        if (failed.length) setPhotoProblems((existing) => [...existing, ...failed])
      } else {
        setPending((p) => [
          ...p,
          ...ready.map((file) => ({ key: `${file.name}-${file.size}-${Math.random()}`, file, url: URL.createObjectURL(file) })),
        ])
      }
    } finally {
      setPhotoBusy(false)
      setPhotoStatus('')
    }
  }

  async function photoAction(fn, successMessage) {
    const before = photos
    setPhotoBusy(true)
    try {
      const updated = await fn()
      setPhotos(updated.photos)
      if (successMessage) notify(successMessage)
    } catch (err) {
      setPhotos(before)
      notify(err.message, 'error')
    } finally {
      setPhotoBusy(false)
    }
  }

  const gridItems = isEdit
    ? photos.map((p) => ({ key: p.id, url: assetUrl(p.url), isCover: p.is_cover }))
    : pending.map((p, i) => ({ key: p.key, url: p.url, isCover: i === 0 }))

  const gridHandlers = isEdit
    ? {
        onReorder: (keys) => {
          setPhotos(keys.map((k) => photos.find((p) => p.id === k))) // show the new order straight away
          photoAction(() => adminApi.reorderPhotos(listing.id, keys), 'Photo order saved.')
        },
        onCover: (key) => photoAction(() => adminApi.setCover(listing.id, key), 'Cover photo changed.'),
        onRemove: (key) => setPhotoToRemove(key),
      }
    : {
        onReorder: (keys) => setPending(keys.map((k) => pending.find((p) => p.key === k))),
        onCover: (key) => setPending((list) => [list.find((p) => p.key === key), ...list.filter((p) => p.key !== key)]),
        onRemove: (key) => {
          setPending((list) => {
            const gone = list.find((p) => p.key === key)
            if (gone) URL.revokeObjectURL(gone.url)
            return list.filter((p) => p.key !== key)
          })
        },
      }

  // ----- save -----
  async function onSubmit(e) {
    e.preventDefault()
    setFormError('')
    const found = validate(form)
    setErrors(found)
    const first = Object.keys(found)[0]
    if (first) {
      document.getElementById(id(first))?.focus()
      return
    }

    setSaving(true)
    const payload = buildPayload(form, amenities)
    try {
      if (isEdit) {
        const updated = await adminApi.updateListing(listing.id, payload)
        setPhotos(updated.photos)
        notify('Changes saved.')
      } else {
        const created = await adminApi.createListing(payload)
        if (pending.length) {
          try {
            for (const p of pending) await adminApi.uploadPhotos(created.id, [p.file]) // one per request
          } catch (err) {
            notify(`${created.ref_code} was saved, but the photos failed: ${err.message} Add them below.`, 'error')
            navigate(`/admin/listings/${created.id}`, { replace: true })
            return
          }
        }
        notify(`${created.ref_code} was added.`)
        navigate(`/admin/listings/${created.id}`, { replace: true })
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        const { body, ...fields } = err.fields
        setErrors(fields)
        setFormError(body || err.message)
      } else if (err.status !== 401) {
        setFormError(err.message)
      }
    } finally {
      setSaving(false)
    }
  }

  const statusOptions = ['available', form.kind === 'sale' ? 'sold' : 'rented', 'hidden']

  return (
    <>
      <div className="admin-head">
        <div>
          <p className="back">
            <Link to="/admin/listings">← All listings</Link>
          </p>
          <h1>{isEdit ? `Edit ${listing.ref_code}` : 'Add property'}</h1>
        </div>
        {isEdit && (
          <a href={`/properties/${listing.ref_code}`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
            View on website<span className="sr-only"> (opens in a new tab)</span> ↗
          </a>
        )}
      </div>

      <form onSubmit={onSubmit} noValidate className="listing-form">
        {formError && (
          <p className="form-error" role="alert">
            {formError}
          </p>
        )}

        <section className="panel" aria-labelledby={id('s1')}>
          <h2 id={id('s1')}>Basics</h2>
          <div className="field">
            <label htmlFor={id('title')}>Title</label>
            <input type="text" maxLength={200} placeholder="e.g. 2 BHK flat near Green Park Road" {...bind('title')} />
            {fieldError('title')}
          </div>
          <div className="form-grid">
            <fieldset className="field radio-group">
              <legend>For</legend>
              {[
                ['sale', 'Sale'],
                ['rent', 'Rent'],
              ].map(([value, label]) => (
                <label key={value} className="radio">
                  <input type="radio" name={id('kind')} value={value} checked={form.kind === value} onChange={set('kind')} />
                  <span>{label}</span>
                </label>
              ))}
            </fieldset>
            <div className="field">
              <label htmlFor={id('property_type')}>Property type</label>
              <select {...bind('property_type')}>
                {Object.entries(typeLabel).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor={id('locality')}>Locality</label>
              <input type="text" maxLength={150} {...bind('locality')} />
              {fieldError('locality')}
            </div>
            <div className="field">
              <label htmlFor={id('city')}>City</label>
              <input type="text" maxLength={100} {...bind('city')} />
              {fieldError('city')}
            </div>
          </div>
        </section>

        <section className="panel" aria-labelledby={id('s2')}>
          <h2 id={id('s2')}>Price and size</h2>
          <div className="form-grid">
            <div className="field">
              <label htmlFor={id('price')}>{form.kind === 'rent' ? 'Rent per month (₹)' : 'Price (₹)'}</label>
              <input type="number" inputMode="numeric" min="1" step="1" {...bind('price')} />
              {isInt(form.price) && Number(form.price) > 0 ? (
                <p className="hint">
                  Shown on the website as <strong>{formatPrice(Number(form.price), form.kind)}</strong>
                </p>
              ) : (
                <p className="hint">Whole rupees, e.g. 6800000 for ₹68 Lakh.</p>
              )}
              {fieldError('price')}
            </div>
            <div className="field">
              <label htmlFor={id('carpet_area_sqft')}>Carpet area (sq ft)</label>
              <input type="number" inputMode="numeric" min="1" step="1" {...bind('carpet_area_sqft')} />
              {fieldError('carpet_area_sqft')}
            </div>
          </div>
        </section>

        <section className="panel" aria-labelledby={id('s3')}>
          <h2 id={id('s3')}>Details</h2>
          <p className="hint">Leave a box empty if it does not apply.</p>
          <div className="form-grid form-grid-3">
            {vis.bedrooms && (
              <div className="field">
                <label htmlFor={id('bedrooms')}>Bedrooms</label>
                <input type="number" inputMode="numeric" min="0" max="20" {...bind('bedrooms')} />
                {fieldError('bedrooms')}
              </div>
            )}
            {vis.floors && (
              <>
                <div className="field">
                  <label htmlFor={id('floor')}>Floor (0 = ground)</label>
                  <input type="number" inputMode="numeric" {...bind('floor')} />
                  {fieldError('floor')}
                </div>
                <div className="field">
                  <label htmlFor={id('total_floors')}>Total floors</label>
                  <input type="number" inputMode="numeric" min="0" {...bind('total_floors')} />
                  {fieldError('total_floors')}
                </div>
              </>
            )}
            {vis.age && (
              <div className="field">
                <label htmlFor={id('age_years')}>Age (years)</label>
                <input type="number" inputMode="numeric" min="0" {...bind('age_years')} />
                {fieldError('age_years')}
              </div>
            )}
            <div className="field">
              <label htmlFor={id('facing')}>Facing</label>
              <select {...bind('facing')}>
                <option value="">Not specified</option>
                {FACING.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
            {vis.furnishing && (
              <div className="field">
                <label htmlFor={id('furnishing')}>Furnishing</label>
                <select {...bind('furnishing')}>
                  <option value="">Not specified</option>
                  {FURNISHING.map((f) => (
                    <option key={f} value={f}>
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </section>

        <section className="panel" aria-labelledby={id('s4')}>
          <h2 id={id('s4')}>Description and amenities</h2>
          <div className="field">
            <label htmlFor={id('description')}>Description</label>
            <textarea rows={5} maxLength={5000} placeholder="What makes this property worth visiting?" {...bind('description')} />
            {fieldError('description')}
          </div>

          <div className="field">
            <label htmlFor={id('amenity')}>Amenities</label>
            <div className="input-action">
              <input
                id={id('amenity')}
                type="text"
                maxLength={50}
                value={amenityText}
                placeholder="Type one and press Enter"
                onChange={(e) => setAmenityText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addAmenity(amenityText)
                  }
                }}
              />
              <button type="button" className="btn btn-ghost" onClick={() => addAmenity(amenityText)}>
                Add
              </button>
            </div>
            {amenities.length > 0 && (
              <ul className="chips chips-edit" aria-label="Added amenities">
                {amenities.map((a) => (
                  <li key={a}>
                    {a}
                    <button type="button" aria-label={`Remove ${a}`} onClick={() => setAmenities(amenities.filter((x) => x !== a))}>
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="suggest">
              <span className="hint">Quick add:</span>
              {AMENITY_SUGGESTIONS.filter((s) => !amenities.some((a) => a.toLowerCase() === s.toLowerCase())).map((s) => (
                <button type="button" key={s} className="chip-btn" onClick={() => addAmenity(s)}>
                  + {s}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="panel" aria-labelledby={id('s5')}>
          <h2 id={id('s5')}>Visibility</h2>
          <div className="form-grid">
            <div className="field">
              <label htmlFor={id('status')}>Status</label>
              <select {...bind('status')}>
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
              <p className="hint">Only “Available” properties appear in the website's listings. Hidden ones cannot be opened by visitors.</p>
              {fieldError('status')}
            </div>
            <div className="field">
              <span className="field-label">Home page</span>
              <label className="check">
                <input type="checkbox" checked={form.is_featured} onChange={set('is_featured')} />
                <span>Feature this property on the home page</span>
              </label>
            </div>
          </div>
        </section>

        <section className="panel" aria-labelledby={id('s6')}>
          <h2 id={id('s6')}>Photos</h2>
          <p className="hint">
            jpg, png or webp. Large phone photos are shrunk automatically before they upload. The <strong>cover</strong> photo is the first thing visitors see. Drag photos to reorder, or use the arrow buttons.
            {!isEdit && ' Photos are uploaded when you save the property.'}
          </p>

          <div
            className={`dropzone ${dragOver ? 'is-over' : ''}`}
            onDragOver={(e) => {
              if (e.dataTransfer.types.includes('Files')) {
                e.preventDefault()
                setDragOver(true)
              }
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
              if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files)
            }}
          >
            <p>Drop photos here or</p>
            <label className="btn btn-ghost file-btn">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                disabled={photoBusy}
                onChange={(e) => {
                  addFiles(e.target.files)
                  e.target.value = ''
                }}
              />
              <span>{photoBusy ? photoStatus || 'Working…' : 'Choose photos'}</span>
            </label>
          </div>

          {photoProblems.length > 0 && (
            <ul className="form-error photo-problems" role="alert">
              {photoProblems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}

          <PhotoGrid items={gridItems} disabled={photoBusy || saving} {...gridHandlers} />
        </section>

        <div className="action-bar">
          <Link to="/admin/listings" className="btn btn-ghost">
            Cancel
          </Link>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? (pending.length ? 'Saving and uploading photos…' : 'Saving…') : isEdit ? 'Save changes' : 'Add property'}
          </button>
        </div>
      </form>

      <ConfirmDialog
        open={photoToRemove !== null}
        title="Remove this photo?"
        confirmLabel="Remove photo"
        busy={photoBusy}
        onConfirm={async () => {
          const key = photoToRemove
          await photoAction(() => adminApi.deletePhoto(listing.id, key), 'Photo removed.')
          setPhotoToRemove(null)
        }}
        onCancel={() => setPhotoToRemove(null)}
      >
        <p>The photo is deleted from the property. This cannot be undone.</p>
      </ConfirmDialog>
    </>
  )
}

export default function ListingForm() {
  const { id } = useParams()
  const { data, error, loading, reload } = useFetch((signal) => (id ? adminApi.listing(id, signal) : Promise.resolve(null)), id || 'new')

  if (!id) return <FormBody key="new" listing={null} />
  if (error instanceof ApiError && error.status === 404) {
    return (
      <div className="state">
        <h1 className="state-title">Property not found</h1>
        <p>It may have been deleted.</p>
        <Link to="/admin/listings" className="btn btn-primary">
          Back to listings
        </Link>
      </div>
    )
  }
  if (error) return <ErrorBox error={error} onRetry={reload} title="We could not load this property" />
  // `data` can still be stale (null or another property) for one render after the route changes
  if (loading || !data || String(data.id) !== id) return <Loading label="Loading property…" />
  return <FormBody key={data.id} listing={data} />
}
