'use client'

import { useEffect, useRef } from 'react'

export default function ParticleBackground ({ className = '' }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    let animId
    let w, h

    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.2 + 0.3,
      dx: (Math.random() - 0.5) * 0.0002,
      dy: (Math.random() - 0.5) * 0.0002,
      alpha: Math.random() * 0.4 + 0.1
    }))

    function resize () {
      w = canvas.width = window.innerWidth
      h = canvas.height = window.innerHeight
    }

    function draw () {
      ctx.clearRect(0, 0, w, h)
      particles.forEach(p => {
        p.x += p.dx
        p.y += p.dy
        if (p.x < 0) p.x = 1
        if (p.x > 1) p.x = 0
        if (p.y < 0) p.y = 1
        if (p.y > 1) p.y = 0
        ctx.beginPath()
        ctx.arc(p.x * w, p.y * h, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(99,102,241,${p.alpha})`
        ctx.fill()
      })
      animId = requestAnimationFrame(draw)
    }

    resize()
    draw()
    window.addEventListener('resize', resize)
    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 pointer-events-none z-0 ${className}`}
      aria-hidden
    />
  )
}
