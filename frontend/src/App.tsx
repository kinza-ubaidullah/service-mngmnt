import React from 'react'

function App() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <h1 className="text-3xl font-bold text-slate-800 mb-4">
          Service Management
        </h1>
        <p className="text-slate-600 mb-6">
          System is initializing. This is the frontend setup using React, Vite, and Tailwind CSS v4.
        </p>
        <div className="flex gap-4 justify-center">
          <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-full font-medium text-sm">
            React
          </span>
          <span className="px-4 py-2 bg-purple-100 text-purple-700 rounded-full font-medium text-sm">
            Redux Toolkit
          </span>
          <span className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-full font-medium text-sm">
            Tailwind CSS
          </span>
        </div>
      </div>
    </div>
  )
}

export default App
