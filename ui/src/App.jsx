import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import Marketing from "./pages/Marketing.jsx";

function App() {
  const [count, setCount] = useState(0)

  return (
      <div className="min-h-screen">
          <nav className="bg-blue-800 text-white shadow-lg">
              <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                      <div className="text-2xl font-bold">🤖</div>
                      <h1 className="text-xl font-bold">Artificial Unintelligence</h1>
                  </div>
                  <button
                      className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-full transition duration-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50">
                      Login
                  </button>
              </div>
          </nav>
          <main>
              <Marketing></Marketing>
          </main>
      </div>
  )
}

export default App
