/** Kevvio's shared monogram. Property icons remain separate from the brand. */
export default function BrandMark({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M6 4v16M19 4 6 16m5-5 8 9" />
    </svg>
  );
}
