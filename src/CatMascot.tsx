type CatMascotProps = {
  className?: string;
};

export default function CatMascot({ className = "" }: CatMascotProps) {
  return (
    <svg
      className={`cat-mascot ${className}`.trim()}
      viewBox="0 0 64 64"
      aria-hidden="true"
    >
      <path
        className="cat-mascot-head"
        d="M12 27 9 9c-.4-2.6 2.4-4.4 4.6-3l13 8.2c3.5-.9 7.3-.9 10.8 0l13-8.2c2.2-1.4 5 .4 4.6 3l-3 18c3 4 4.5 8.5 4.5 13.2C56.5 52.2 45.5 59 32 59S7.5 52.2 7.5 40.2C7.5 35.5 9 31 12 27Z"
      />
      <path className="cat-mascot-ear" d="m14 12 3 12 7-7.5Z" />
      <path className="cat-mascot-ear" d="m50 12-3 12-7-7.5Z" />
      <path
        className="cat-mascot-patch"
        d="M25.5 14.5c4-1.3 9-1.3 13 0L35 22h-6Z"
      />
      <ellipse className="cat-mascot-eye" cx="22.5" cy="36" rx="3" ry="4" />
      <ellipse className="cat-mascot-eye" cx="41.5" cy="36" rx="3" ry="4" />
      <circle className="cat-mascot-glint" cx="23.4" cy="34.8" r=".9" />
      <circle className="cat-mascot-glint" cx="42.4" cy="34.8" r=".9" />
      <path className="cat-mascot-nose" d="m32 41-3-2h6Z" />
      <path
        className="cat-mascot-mouth"
        d="M32 41.5v2.2m0 0c-1.7 2.6-4 2.7-5.7 1.2m5.7-1.2c1.7 2.6 4 2.7 5.7 1.2"
      />
      <path
        className="cat-mascot-whisker"
        d="m18 42-10-2m10 6L8 48m38-6 10-2m-10 6 10 2"
      />
    </svg>
  );
}
