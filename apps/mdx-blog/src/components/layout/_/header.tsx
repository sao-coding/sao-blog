// // 解决方案 1: 使用唯一的 layoutId
// {isActive && shouldAnimate && (
//   <m.div
//     layoutId={`header-menu-icon-${item.isChild ? item.childHref : item.href}`} // 使用唯一ID
//     className="flex items-center justify-center w-5"
//     transition={{
//       type: "spring",
//       stiffness: 350,
//       damping: 28,
//       mass: 0.6,
//     }}
//     style={{ willChange: "transform" }}
//     aria-hidden="true"
//   >
//     <item.icon size={16} className="text-teal-400" />
//   </m.div>
// )}

// // 解决方案 2: 添加图标过渡动画
// {isActive && shouldAnimate && (
//   <m.div
//     layoutId="header-menu-icon"
//     className="flex items-center justify-center w-5"
//     transition={{
//       type: "spring",
//       stiffness: 350,
//       damping: 28,
//       mass: 0.6,
//     }}
//     style={{ willChange: "transform" }}
//     aria-hidden="true"
//   >
//     <m.div
//       key={`icon-${item.isChild ? item.childHref : item.href}`} // 添加key强制重新渲染
//       initial={{ opacity: 0, scale: 0.8 }}
//       animate={{ opacity: 1, scale: 1 }}
//       exit={{ opacity: 0, scale: 0.8 }}
//       transition={{
//         duration: 0.2,
//         ease: "easeInOut"
//       }}
//     >
//       <item.icon size={16} className="text-teal-400" />
//     </m.div>
//   </m.div>
// )}

// // 解决方案 3: 完全重写图标部分 (推荐)
// {isActive && shouldAnimate && (
//   <m.div
//     layoutId="header-menu-icon"
//     className="flex items-center justify-center w-5 relative"
//     transition={{
//       type: "spring",
//       stiffness: 350,
//       damping: 28,
//       mass: 0.6,
//     }}
//     style={{ willChange: "transform" }}
//     aria-hidden="true"
//   >
//     <AnimatePresence mode="wait">
//       <m.div
//         key={`icon-${item.isChild ? item.childHref : item.href}`}
//         initial={{ opacity: 0, scale: 0.5, rotate: -180 }}
//         animate={{ opacity: 1, scale: 1, rotate: 0 }}
//         exit={{ opacity: 0, scale: 0.5, rotate: 180 }}
//         transition={{
//           duration: 0.3,
//           ease: "easeInOut"
//         }}
//         className="absolute inset-0 flex items-center justify-center"
//       >
//         <item.icon size={16} className="text-teal-400" />
//       </m.div>
//     </AnimatePresence>
//   </m.div>
// )}
