'use client'

import { useState } from 'react'

export const Count = () => {
  const [count, setCount] = useState(0)

  return (
    <div className="my-4 p-4 border rounded bg-blue-50">
      <p className="mb-2">Count: {count}</p>
      <button
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        onClick={() => setCount(count + 1)}
      >
        Increment
      </button>
    </div>
  )
}
