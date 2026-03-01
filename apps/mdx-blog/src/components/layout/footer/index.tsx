const Footer = () => {
  return (
    <footer className="w-full border-t bg-white text-center dark:bg-gray-900 dark:text-gray-300 py-6 mt-32">
      <p className="text-sm">
        &copy; {new Date().getFullYear()} My Blog. All rights reserved.
      </p>
    </footer>
  )
}

export default Footer
