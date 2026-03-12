export function Flame() {
  return (
    <div className="relative flex items-center justify-center">
      <div className="absolute h-16 w-8 animate-flicker rounded-[999px] bg-gradient-to-t from-flame via-ember to-yellow-100 blur-[1px]" />
      <div className="h-20 w-10 animate-flicker rounded-[999px] bg-gradient-to-t from-orange-500 via-amber-300 to-yellow-100 opacity-80" />
    </div>
  );
}
