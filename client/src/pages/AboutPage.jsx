import { UserCircle } from 'lucide-react'
import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { servicesImage } from '../assets/assets'
import { aboutCards, members } from '../data/aboutData'

gsap.registerPlugin(ScrollTrigger)

export function AboutPage() {
  const teamSectionRef = useRef(null)
  const cardRefs = useRef([])

  useEffect(() => {
    const ctx = gsap.context(() => {
      const cards = cardRefs.current.filter(Boolean)
      const stackScroll = teamSectionRef.current?.querySelector('.team-stack-scroll')

      if (!stackScroll || cards.length === 0) {
        return
      }

      gsap.set(cards, {
        opacity: 0,
        scale: 0.92,
        y: 120,
        zIndex: (index) => index + 1,
      })

      gsap.set(cards[0], {
        opacity: 1,
        scale: 1,
        y: 0,
      })

      cards.slice(1).forEach((card, index) => {
        const cardIndex = index + 1

        gsap.fromTo(
          card,
          {
            y: 120,
            scale: 0.92,
            opacity: 0,
          },
          {
            y: cardIndex * 18,
            scale: 1 - cardIndex * 0.03,
            opacity: 1,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: stackScroll,
              start: () => `top+=${cardIndex * window.innerHeight * 0.68} top`,
              end: () => `top+=${(cardIndex + 1) * window.innerHeight * 0.68} top`,
              scrub: true,
            },
          },
        )
      })

      ScrollTrigger.refresh()
    }, teamSectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            alt="Automotive service workspace"
            className="h-full w-full object-cover opacity-20"
            src={servicesImage}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--bg-primary)] via-[rgb(7_11_18_/_0.92)] to-[rgb(7_11_18_/_0.56)]" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[rgb(7_11_18_/_0.20)] to-[var(--bg-primary)]" />
        </div>

        <div className="relative mx-auto grid min-h-[620px] w-full max-w-[1480px] items-center gap-10 px-4 py-16 md:px-8 lg:grid-cols-[1fr_0.9fr] xl:px-10">
          <div className="max-w-3xl">
            <span className="inline-block rounded-full border border-[var(--primary)]/40 bg-[var(--primary)]/10 px-4 py-2 text-xs font-bold uppercase tracking-wide text-[var(--primary)]">
              About
            </span>

            <h1 className="mt-6 text-5xl font-extrabold leading-tight md:text-6xl">
              A focused operating system for vehicle parts{' '}
              <span className="text-[var(--primary)]">teams.</span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[var(--text-secondary)]">
              Autocare brings sales, service, inventory, customer records, and reporting into one clean workspace for
              growing workshops and parts counters.
            </p>
          </div>

          <div className="relative min-h-[320px] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] shadow-2xl shadow-red-500/10 md:min-h-[430px]">
            <img
              alt="Autocare service dashboard concept"
              className="absolute inset-0 h-full w-full object-cover"
              src={servicesImage}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[rgb(7_11_18_/_0.70)] via-transparent to-transparent" />
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1480px] px-4 pb-16 md:px-8 xl:px-10">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          {aboutCards.map((card) => {
            const Icon = card.icon

            return (
              <article
                className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]/90 p-6 transition duration-300 hover:-translate-y-1 hover:border-[var(--primary)]/50 hover:shadow-xl hover:shadow-red-500/10"
                key={card.title}
              >
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl border border-[var(--primary)]/30 bg-[var(--primary)]/20">
                  <Icon className="text-[var(--primary)]" size={28} />
                </div>

                <h2 className="text-xl font-bold">{card.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">{card.desc}</p>
              </article>
            )
          })}
        </div>
      </section>

      <section ref={teamSectionRef} className="mx-auto w-full max-w-[1480px] px-4 pb-24 md:px-8 xl:px-10">
        <div className="mb-6 mt-2 flex items-center gap-6">
          <div className="h-px flex-1 bg-[var(--primary)]/50" />
          <h2 className="text-center text-3xl font-bold md:text-4xl">
            Meet the <span className="text-[var(--primary)]">Project Team</span>
          </h2>
          <div className="h-px flex-1 bg-[var(--primary)]/50" />
        </div>

        <p className="mx-auto mb-14 max-w-3xl text-center leading-relaxed text-[var(--text-secondary)]">
          This academic project was completed through divided responsibilities, where each member contributed to design,
          development, testing, documentation, and project coordination.
        </p>

        <div className="team-stack-scroll relative h-[520vh] min-h-[3200px]">
          <div className="sticky top-24 h-[calc(100vh-7rem)] min-h-[620px]">
            {members.map((member, index) => (
              <article
                className="absolute inset-0 min-h-[560px] overflow-hidden rounded-3xl border border-[var(--border)] bg-[#111827] shadow-2xl shadow-black/40"
                key={member.name}
                ref={(el) => {
                  cardRefs.current[index] = el
                }}
              >
                <div className="grid h-full min-h-[560px] grid-cols-1 lg:grid-cols-2">
                  <div className="relative flex min-h-[260px] items-center justify-center overflow-hidden bg-gradient-to-br from-[rgb(239_68_68_/_0.20)] to-black">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(239,68,68,0.25),_transparent_60%)]" />

                    <div className="relative flex h-44 w-44 items-center justify-center overflow-hidden rounded-full border-4 border-[var(--primary)] bg-white/10 shadow-xl shadow-red-500/20">
                      {member.image ? (
                        <img alt={member.name} className="h-full w-full object-cover" src={member.image} />
                      ) : (
                        <UserCircle className="text-gray-200" size={140} />
                      )}
                    </div>

                    <span className="absolute bottom-6 left-6 text-7xl font-black text-white/5">
                      0{index + 1}
                    </span>
                  </div>

                  <div className="relative flex flex-col justify-center overflow-hidden p-8 md:p-12">
                    <p className="text-sm font-bold uppercase tracking-widest text-[var(--primary)]">
                      {member.role}
                    </p>

                    <h3 className="mt-3 text-4xl font-extrabold">{member.name}</h3>

                    <div className="mb-6 mt-5 h-[3px] w-16 bg-[var(--primary)]" />

                    <p className="max-w-xl text-lg leading-relaxed text-[var(--text-secondary)]">
                      {member.desc}
                    </p>

                    <div className="pointer-events-none absolute bottom-8 right-8 text-8xl font-black text-red-500/10">
                      TEAM
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
