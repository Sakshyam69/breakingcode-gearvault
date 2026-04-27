import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BarChart3,
  Bell,
  Brain,
  CalendarDays,
  FileText,
  MessageCircle,
  Package,
  Star,
  Users,
  UserPlus,
  Wrench,
} from 'lucide-react'
import { hero1, hero2, hero3 } from '../assets/assets'
import { Button } from '../components/common/Button'
import HowItWorks from '../components/common/HowItWorks'

const features = [
  { icon: Package, title: 'Inventory Management' },
  { icon: Brain, title: 'AI Prediction System' },
  { icon: FileText, title: 'Invoice Automation' },
  { icon: BarChart3, title: 'Customer History Tracking' },
  { icon: Bell, title: 'Low Stock Alerts' },
]

const stats = [
  { icon: Users, value: '500+', label: 'Happy Customers' },
  { icon: Wrench, value: '2,000+', label: 'Services Completed' },
  { icon: Package, value: '5,000+', label: 'Parts in Inventory' },
  { icon: Star, value: '4.8/5', label: 'Customer Rating' },
]

const heroImages = [hero1, hero2, hero3]

const getStatConfig = (value) => {
  const normalizedValue = value.replace(/,/g, '')
  const target = Number.parseFloat(normalizedValue)
  const suffix = value.includes('/5') ? '/5' : value.includes('+') ? '+' : ''
  const decimals = value.includes('.') ? 1 : 0

  return { decimals, suffix, target }
}

const formatStatValue = (value, config) => {
  const formattedValue = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: config.decimals,
    minimumFractionDigits: config.decimals,
  }).format(value)

  return `${formattedValue}${config.suffix}`
}

function HomeCTA() {
  const ctaRef = useRef(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting)
      },
      {
        threshold: 0.3,
      }
    )

    if (ctaRef.current) {
      observer.observe(ctaRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <section className="bg-white px-4 py-16 text-[#070B12] md:px-8">
      <div
        ref={ctaRef}
        className={`mx-auto flex max-w-[1480px] flex-col items-start justify-between gap-8 rounded-lg border border-white/10 bg-[var(--bg-primary)] px-6 py-10 text-[var(--text-primary)] shadow-2xl shadow-black/20 transition-all duration-700 ease-out md:flex-row md:items-center md:px-10 ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
        }`}
      >
        <div className="max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-widest text-[var(--primary)]">
            Ready to streamline your workshop?
          </p>
          <h2 className="mt-3 text-3xl font-extrabold md:text-4xl">
            Start managing parts, services, invoices, and reports in one place.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[var(--text-secondary)]">
            Set up your AutoCare account or talk with us about the best workflow
            for your vehicle service team.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Button as={Link} className="gap-2 px-6 py-4" to="/signup" variant="danger">
            <UserPlus size={20} />
            Get Started
            <ArrowRight size={18} />
          </Button>
          <Button
            as={Link}
            className="gap-2 px-6 py-4"
            to="/contact"
            variant="lightOutline"
          >
            <MessageCircle size={20} />
            Contact Us
          </Button>
        </div>
      </div>
    </section>
  )
}

export function HomePage() {
  const [currentHero, setCurrentHero] = useState(0)
  const [animatedStats, setAnimatedStats] = useState(() => stats.map(() => 0))
  const statsRef = useRef(null)
  const statsFrameRef = useRef(null)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentHero((previousHero) => (previousHero + 1) % heroImages.length)
    }, 4000)

    return () => clearInterval(interval)
  }, [heroImages.length])

  useEffect(() => {
    const statConfigs = stats.map((item) => getStatConfig(item.value))

    const resetStats = () => {
      if (statsFrameRef.current) {
        cancelAnimationFrame(statsFrameRef.current)
      }

      setAnimatedStats(stats.map(() => 0))
    }

    const animateStats = () => {
      if (statsFrameRef.current) {
        cancelAnimationFrame(statsFrameRef.current)
      }

      const duration = 1400
      const startedAt = performance.now()

      const tick = (now) => {
        const progress = Math.min((now - startedAt) / duration, 1)
        const easedProgress = 1 - Math.pow(1 - progress, 3)

        setAnimatedStats(
          statConfigs.map((config) => config.target * easedProgress)
        )

        if (progress < 1) {
          statsFrameRef.current = requestAnimationFrame(tick)
        }
      }

      statsFrameRef.current = requestAnimationFrame(tick)
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          animateStats()
        } else {
          resetStats()
        }
      },
      {
        threshold: 0.45,
      }
    )

    if (statsRef.current) {
      observer.observe(statsRef.current)
    }

    return () => {
      observer.disconnect()

      if (statsFrameRef.current) {
        cancelAnimationFrame(statsFrameRef.current)
      }
    }
  }, [])

  return (
    <>
    <main className="relative z-10 min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <section className="relative min-h-[780px] overflow-visible pb-24">
        {heroImages.map((image, index) => (
          <img
            alt="Vehicle parts and service management background"
            className={`absolute inset-0 h-[calc(100%-3rem)] w-full object-cover object-center transition-opacity duration-1000 ${
              index === currentHero ? 'opacity-100' : 'opacity-0'
            }`}
            key={image}
            src={image}
          />
        ))}

        <div className="absolute inset-x-0 top-0 h-[calc(100%-3rem)] bg-gradient-to-r from-black via-black/75 to-black/20" />
        <div className="absolute inset-x-0 top-0 h-[calc(100%-3rem)] bg-black/20" />

        <div className="relative z-10 mx-auto max-w-[1480px] px-4 pb-28 pt-36 md:px-8 xl:px-10">
          <div className="max-w-2xl">
            <div className="mb-6 flex items-center gap-4">
              <span className="h-[2px] w-10 bg-[var(--primary)]"></span>
              <p className="text-sm font-semibold uppercase tracking-widest">
                Smart. Reliable. Efficient.
              </p>
            </div>

            <h1 className="text-5xl font-extrabold leading-tight tracking-normal md:text-7xl">
              Smart Vehicle Parts & Service Management{' '}
              <span className="text-[var(--primary)]">System</span>
            </h1>

            <p className="mt-6 text-lg leading-relaxed text-[var(--text-secondary)]">
              Manage inventory, track vehicle services, create invoices, and get
              AI-powered insights to keep vehicles running at their best.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Button as={Link} className="gap-2 px-7 py-4" to="/contact" variant="danger">
                <CalendarDays size={20} />
                Book Service
              </Button>

              <Button
                as={Link}
                className="gap-2 px-7 py-4"
                to="/services"
                variant="lightOutline"
              >
                <Package size={20} />
                Browse Parts
              </Button>
            </div>

            <div className="mt-10 grid grid-cols-2 gap-4 rounded-lg border border-white/10 bg-black/40 p-5 backdrop-blur-md md:grid-cols-5">
              {features.map((feature) => {
                const Icon = feature.icon

                return (
                  <div className="text-center" key={feature.title}>
                    <Icon className="mx-auto mb-3 text-[var(--primary)]" size={28} />
                    <p className="text-sm font-medium">{feature.title}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div ref={statsRef} className="absolute inset-x-4 bottom-0 z-40 mx-auto grid max-w-7xl translate-y-1/2 grid-cols-2 gap-5 rounded-lg bg-[var(--text-primary)] px-6 py-6 text-center text-[var(--bg-card)] shadow-2xl shadow-black/20 md:grid-cols-4 md:px-10">
          {stats.map((item, index) => {
            const Icon = item.icon
            const statConfig = getStatConfig(item.value)

            return (
              <div className="flex items-center justify-center gap-3 text-left" key={item.label}>
                <Icon className="text-[var(--primary)]" size={34} />
                <div>
                  <h3 className="text-2xl font-extrabold leading-none md:text-3xl">
                    {formatStatValue(animatedStats[index], statConfig)}
                  </h3>
                  <p className="mt-1 text-xs font-medium text-[var(--text-muted)] md:text-sm">{item.label}</p>
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </main>
    <HowItWorks/>
    <HomeCTA/>
   </>

  )
}
