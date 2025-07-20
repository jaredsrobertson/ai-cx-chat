import { useAnalytics } from '@/contexts/AnalyticsContext';
import { HiOutlineLightBulb, HiOutlineFaceSmile, HiOutlineFaceFrown, HiOutlineMinus } from 'react-icons/hi2';
import { motion, AnimatePresence } from 'framer-motion';

const SentimentIcon = ({ sentiment }) => {
  switch (sentiment) {
    case 'Positive':
      return <HiOutlineFaceSmile className="w-5 h-5 text-green-500" />;
    case 'Negative':
      return <HiOutlineFaceFrown className="w-5 h-5 text-red-500" />;
    default:
      return <HiOutlineMinus className="w-5 h-5 text-gray-400" />;
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: -10 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 10 },
};

export default function AnalyticsDisplay() {
  const { latest } = useAnalytics();

  return (
    <div className="bg-brand-ui-01 dark:bg-dark-brand-ui-03/50 px-3 py-2 border-b border-brand-ui-03 dark:border-dark-brand-ui-03/50">
      <div className="grid grid-cols-2 gap-4 text-center">
        {/* Intent Section */}
        <div className="flex items-center justify-center gap-2">
          <HiOutlineLightBulb className="w-5 h-5 text-brand-blue dark:text-dark-brand-blue" />
          <span className="text-xs font-medium text-brand-text-secondary dark:text-dark-brand-text-secondary mr-1">Intent:</span>
          <AnimatePresence mode="wait">
            <motion.span
              key={latest.intent}
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ duration: 0.2 }}
              className="text-sm font-bold text-brand-text-primary dark:text-dark-brand-text-primary"
            >
              {latest.intent}
            </motion.span>
          </AnimatePresence>
        </div>

        {/* Sentiment Section */}
        <div className="flex items-center justify-center gap-2">
          <SentimentIcon sentiment={latest.sentiment} />
          <span className="text-xs font-medium text-brand-text-secondary dark:text-dark-brand-text-secondary mr-1">Sentiment:</span>
          <AnimatePresence mode="wait">
            <motion.span
              key={latest.sentiment}
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ duration: 0.2 }}
              className="text-sm font-bold text-brand-text-primary dark:text-dark-brand-text-primary"
            >
              {latest.sentiment}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}