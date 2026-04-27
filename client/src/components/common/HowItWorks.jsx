import { useEffect, useRef, useState } from "react";
import {
  PackagePlus,
  ClipboardCheck,
  ReceiptText,
  BarChart3,
} from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import createImage from "../../assets/create.png";
import inventoryImage from "../../assets/manageInv.png";
import reportImage from "../../assets/Report.png";
import invoiceImage from "../../assets/invoice.png";

gsap.registerPlugin(ScrollTrigger);

const steps = [
  {
    icon: PackagePlus,
    title: "Add Parts",
    desc: "Create part records, set stock levels, and keep every workshop item easy to find.",
    image: inventoryImage,
    imageFit: "object-cover",
  },
  {
    icon: ClipboardCheck,
    title: "Create Service",
    desc: "Book the job, assign staff, and connect the right parts to each vehicle visit.",
    image: createImage,
    imageFit: "object-contain",
  },
  {
    icon: ReceiptText,
    title: "Generate Invoice",
    desc: "Turn completed service work into clean invoices with parts, labor, and payments tracked.",
    image: invoiceImage,
    imageFit: "object-contain",
  },
  {
    icon: BarChart3,
    title: "Analyze Data",
    desc: "Review service performance, inventory movement, and customer activity in reports.",
    image: reportImage,
    imageFit: "object-cover",
  },
];

const mobilePaths = [
  "M 28 76 C 8 150 56 200 28 276",
  "M 28 276 C 56 350 8 400 28 476",
  "M 28 476 C 8 550 56 600 28 676",
];

const HowItWorks = () => {
  const sectionRef = useRef(null);
  const [workflowGraph, setWorkflowGraph] = useState({
    paths: [],
    points: [],
  });

  useEffect(() => {
    const updateWorkflowGraph = () => {
      const map = sectionRef.current?.querySelector(".workflow-map");
      const cards = gsap.utils.toArray(".workflow-card", sectionRef.current);

      if (!map || cards.length < 4) {
        return;
      }

      const mapRect = map.getBoundingClientRect();
      const points = cards.map((card, index) => {
        const parentRect = card.offsetParent?.getBoundingClientRect();
        const isLeft = index % 2 === 0;

        if (!parentRect) {
          return {
            x: 0,
            y: 0,
          };
        }

        return {
          x:
            parentRect.left -
            mapRect.left +
            card.offsetLeft +
            (isLeft ? card.offsetWidth : 0),
          y:
            parentRect.top -
            mapRect.top +
            card.offsetTop +
            card.offsetHeight / 2,
        };
      });

      const paths = points.slice(0, -1).map((point, index) => {
        const nextPoint = points[index + 1];
        const direction = nextPoint.x > point.x ? 1 : -1;
        const handle = Math.max(140, Math.abs(nextPoint.x - point.x) * 0.42);
        const controlOneX = point.x + handle * direction;
        const controlTwoX = nextPoint.x - handle * direction;

        return `M ${point.x} ${point.y} C ${controlOneX} ${point.y} ${controlTwoX} ${nextPoint.y} ${nextPoint.x} ${nextPoint.y}`;
      });

      setWorkflowGraph({ paths, points });
    };

    updateWorkflowGraph();
    requestAnimationFrame(updateWorkflowGraph);

    ScrollTrigger.addEventListener("refreshInit", updateWorkflowGraph);
    window.addEventListener("resize", updateWorkflowGraph);

    return () => {
      ScrollTrigger.removeEventListener("refreshInit", updateWorkflowGraph);
      window.removeEventListener("resize", updateWorkflowGraph);
    };
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray(".workflow-card");

      gsap.set(cards, {
        autoAlpha: 0,
        y: 44,
        scale: 0.96,
      });

      cards.forEach((card, index) => {
        const stepNumber = card.querySelector(".step-number");
        const image = card.querySelector(".workflow-image");

        const timeline = gsap.timeline({
          scrollTrigger: {
            trigger: card,
            start: index === 0 ? "top 86%" : "top 78%",
            toggleActions: "play none none reverse",
          },
        });

        timeline
          .to(card, {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            duration: 0.7,
            ease: "power3.out",
          })
          .fromTo(
            stepNumber,
            {
              opacity: 0,
              scale: 0,
            },
            {
              opacity: 1,
              scale: 1,
              duration: 0.35,
              ease: "back.out(1.8)",
            },
            "-=0.38"
          )
          .fromTo(
            image,
            {
              opacity: 0,
              x: -18,
              scale: 0.98,
            },
            {
              opacity: 1,
              x: 0,
              scale: 1,
              duration: 0.45,
              ease: "power2.out",
            },
            "-=0.3"
          );
      });

      gsap.utils.toArray(".mobile-flow-path").forEach((path) => {
        const pathLength = path.getTotalLength();
        const pathIndex = Number(path.dataset.pathIndex);

        gsap.set(path, {
          strokeDasharray: pathLength,
          strokeDashoffset: pathLength,
        });

        gsap.to(path, {
          strokeDashoffset: 0,
          ease: "none",
          scrollTrigger: {
            trigger: cards[pathIndex + 1] || cards[pathIndex],
            start: "top 82%",
            end: "center 55%",
            scrub: 1,
            invalidateOnRefresh: true,
          },
        });
      });

    }, sectionRef);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (!workflowGraph.paths.length) {
      return undefined;
    }

    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray(".workflow-card");

      gsap.utils.toArray(".desktop-flow-path").forEach((path) => {
        const pathLength = path.getTotalLength();
        const pathIndex = Number(path.dataset.pathIndex);

        gsap.set(path, {
          strokeDasharray: pathLength,
          strokeDashoffset: pathLength,
        });

        gsap.to(path, {
          strokeDashoffset: 0,
          ease: "none",
          scrollTrigger: {
            trigger: cards[pathIndex + 1] || cards[pathIndex],
            start: "top 82%",
            end: "center 55%",
            scrub: 1,
            invalidateOnRefresh: true,
          },
        });
      });

      gsap.set(".desktop-flow-dot", {
        autoAlpha: 0,
        scale: 0,
        transformOrigin: "center center",
      });

      gsap.utils.toArray(".desktop-flow-dot").forEach((dot) => {
        const pointIndex = Number(dot.dataset.pointIndex);

        gsap.to(dot, {
          autoAlpha: 1,
          scale: 1,
          duration: 0.35,
          ease: "back.out(1.7)",
          scrollTrigger: {
            trigger: cards[pointIndex] || cards[0],
            start: pointIndex === 0 ? "top 86%" : "top 78%",
            toggleActions: "play none none reverse",
          },
        });
      });
    }, sectionRef);

    return () => ctx.revert();
  }, [workflowGraph.paths]);

  return (
    <section ref={sectionRef} className="bg-white pb-14 pt-28 text-[#070B12] md:pb-16 md:pt-32">
      <div className="mx-auto max-w-[1480px] px-4 md:px-8 xl:px-10">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-red-500 font-bold uppercase tracking-widest text-sm">
            How It Works
          </span>

          <h2 className="text-4xl font-extrabold mt-3 md:text-5xl">
            A clear workflow from stock to reports
          </h2>

          <p className="text-gray-500 mt-4 text-base leading-relaxed md:text-lg">
            AutoCare connects daily workshop operations into one simple process,
            from adding parts to analyzing business performance.
          </p>
        </div>

        <div className="workflow-map relative w-full overflow-hidden py-2">
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-20 hidden h-full w-full md:block"
            preserveAspectRatio="none"
          >
            {workflowGraph.paths.map((path, index) => (
              <path
                key={path}
                className="desktop-flow-path"
                d={path}
                data-path-index={index}
                fill="none"
                stroke="#ef4444"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="5"
              />
            ))}

            {workflowGraph.points.map((point, index) => (
              <circle
                key={`${point.x}-${point.y}`}
                className="desktop-flow-dot"
                cx={point.x}
                cy={point.y}
                data-point-index={index}
                fill="#ef4444"
                r="6"
                stroke="#ffffff"
                strokeWidth="4"
              />
            ))}
          </svg>

          <svg
            aria-hidden="true"
            className="pointer-events-none absolute left-2 top-0 z-0 h-full w-14 md:hidden"
            preserveAspectRatio="none"
            viewBox="0 0 64 760"
          >
            {mobilePaths.map((path, index) => (
              <path
                key={path}
                className="flow-path mobile-flow-path"
                d={path}
                data-path-index={index}
                fill="none"
                stroke="#ef4444"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="4"
              />
            ))}
          </svg>

          <div className="relative z-10 space-y-7 md:space-y-8">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isLeft = index % 2 === 0;

              return (
                <div
                  key={index}
                  className={`workflow-card relative w-full pl-10 opacity-0 md:w-[520px] md:pl-0 ${
                    isLeft ? "md:mr-auto" : "md:ml-auto"
                  }`}
                >
                  <div className="step-number absolute left-3 top-3 z-20 flex h-11 w-11 items-center justify-center rounded-full border-4 border-white bg-red-500 text-base font-bold text-white shadow-lg md:-left-5 md:-top-5 md:h-12 md:w-12 md:text-lg">
                    {index + 1}
                  </div>

                  <div className="relative overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl transition duration-300 hover:-translate-y-1.5 hover:shadow-2xl md:flex md:min-h-[150px]">
                    <div className="workflow-image h-36 overflow-hidden border-b border-gray-100 bg-gray-50 md:h-auto md:w-44 md:shrink-0 md:border-b-0 md:border-r">
                      <img
                        alt={`${step.title} workflow screen`}
                        className={`h-full w-full ${step.imageFit}`}
                        src={step.image}
                      />
                    </div>

                    <div className="p-5 md:p-6">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-500 text-white shadow-lg shadow-red-500/30">
                        <Icon size={24} />
                      </div>

                      <h3 className="mt-4 text-xl font-bold">{step.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-gray-500 md:text-base">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
