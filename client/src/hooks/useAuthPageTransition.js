import { useCallback, useEffect, useRef } from 'react'
import gsap from 'gsap'
import { useLocation, useNavigate } from 'react-router-dom'

const getTransitionValues = (direction) => {
  if (direction === 'login') {
    return {
      enterOrigin: 'left center',
      enterRotationY: -94,
      enterX: -120,
    }
  }

  return {
    enterOrigin: 'right center',
    enterRotationY: 94,
    enterX: 120,
  }
}

export function useAuthPageTransition(defaultDirection) {
  const location = useLocation()
  const navigate = useNavigate()
  const pageRef = useRef(null)
  const mediaRef = useRef(null)

  useEffect(() => {
    const direction = location.state?.authTransitionDirection ?? defaultDirection
    const { enterOrigin, enterRotationY, enterX } = getTransitionValues(direction)

    const ctx = gsap.context(() => {
      gsap.set(pageRef.current, {
        backfaceVisibility: 'hidden',
        transformPerspective: 1200,
        transformStyle: 'preserve-3d',
        transformOrigin: enterOrigin,
      })

      gsap.fromTo(
        pageRef.current,
        {
          autoAlpha: 0,
          filter: 'blur(8px)',
          rotationY: enterRotationY,
          scale: 0.92,
          x: enterX,
          z: -180,
        },
        {
          autoAlpha: 1,
          filter: 'blur(0px)',
          rotationY: 0,
          scale: 1,
          x: 0,
          z: 0,
          duration: 1.15,
          ease: 'power2.out',
          clearProps: 'filter,visibility,opacity,transform,transformOrigin',
        },
      )

      if (mediaRef.current) {
        gsap.fromTo(
          mediaRef.current,
          {
            scale: 1.06,
            filter: 'blur(4px)',
          },
          {
            scale: 1,
            filter: 'blur(0px)',
            duration: 1.2,
            ease: 'power2.out',
            clearProps: 'filter,transform',
          },
        )
      }
    }, pageRef)

    return () => ctx.revert()
  }, [defaultDirection, location.key, location.state])

  const navigateWithAuthTransition = useCallback(
    (event, path, direction) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
        return
      }

      event.preventDefault()

      navigate(path, {
        state: {
          authTransitionDirection: direction,
        },
      })
    },
    [navigate],
  )

  return {
    mediaRef,
    navigateWithAuthTransition,
    pageRef,
  }
}
