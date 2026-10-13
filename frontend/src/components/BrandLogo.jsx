/** The DevSphere logo mark (on its own dark tile, so it looks right in light and dark mode) plus the name. */
export default function BrandLogo({ size = 40 }) {
  return (
    <>
      <img className="brand-logo" src="/logo-mark.png" width={size} height={size} alt="" />
      <span className="brand-name">
        Dev<span>Sphere</span>
      </span>
    </>
  )
}
