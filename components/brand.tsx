import Link from "next/link";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link className="brand" href="/" aria-label="RepoNest 首页">
      <span className="brand-mark" aria-hidden="true">
        <span className="brand-orbit" />
        <span className="brand-nest brand-nest-back" />
        <span className="brand-nest brand-nest-front" />
        <i />
      </span>
      {!compact && (
        <span className="brand-type">
          RepoNest
          <small>GitHub knowledge space</small>
        </span>
      )}
    </Link>
  );
}
