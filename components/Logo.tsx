import Image from "next/image";

interface LogoProps {
  size?: number;
  className?: string;
  priority?: boolean;
}

export function Logo({ size = 120, className = "", priority = false }: LogoProps) {
  const width = Math.round(size * (661 / 1024));
  return (
    <Image
      src="/logo.png"
      alt="Sainte Genevieve Riverboat"
      width={width}
      height={size}
      priority={priority}
      className={className}
    />
  );
}
