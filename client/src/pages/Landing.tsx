import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Network } from 'lucide-react';
import { Logo } from '../components/Logo';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-base-950 bg-radial-fade flex flex-col">
      <header className="px-6 sm:px-10 h-20 flex items-center justify-between">
        <Logo size={32} />
        <span className="tag text-gold-400 border-gold-700/30 bg-gold-500/5">DEMO MODE</span>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-5xl sm:text-7xl font-semibold tracking-tight text-gradient-gold mb-6">
            REVORA
          </h1>
          <p className="text-xl sm:text-2xl text-cream-200 font-medium max-w-2xl mx-auto mb-4">
            Turn failed payments into recovered revenue.
          </p>
          <p className="text-sm sm:text-base text-cream-400 max-w-xl mx-auto mb-10 leading-relaxed">
            An autonomous revenue recovery agent that detects risk, chooses the right intervention,
            and executes within merchant-defined boundaries.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigate('/overview')}
              className="group flex items-center gap-2 bg-gold-500 hover:bg-gold-400 text-base-950 font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              Launch Demo
              <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button
              onClick={() => navigate('/architecture')}
              className="flex items-center gap-2 border border-base-600 hover:border-gold-700/50 text-cream-200 font-medium px-6 py-3 rounded-lg transition-colors"
            >
              <Network size={16} />
              View Architecture
            </button>
          </div>
        </motion.div>
      </main>

      <footer className="px-6 sm:px-10 py-8 text-center text-xs text-cream-400/70">
        Razorpay AI Buildathon · Track: AI Revenue Recovery · Synthetic data, zero paid API keys required.
      </footer>
    </div>
  );
}
