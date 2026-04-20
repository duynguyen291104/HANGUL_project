export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#fafaf5]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#72564c] mx-auto mb-4"></div>
        <p className="text-[#504441] font-['Be_Vietnam_Pro']">Đang tải...</p>
      </div>
    </div>
  );
}
