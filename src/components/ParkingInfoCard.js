import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaParking } from 'react-icons/fa';
import { Accessible, Layers, AccessTime } from 'lucide-react';

const ParkingInfoCard = ({ spot }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <motion.div
      className="bg-white rounded-lg shadow-md p-4 w-[300px] cursor-pointer"
      whileHover={{ scale: 1.05 }}
      onClick={toggleExpand}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-primary font-bold">{spot.name}</h3>
        <i className={`fas fa-angle-${isExpanded ? 'up' : 'down'} text-gray-600`} />
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="flex items-center mb-2">
              <FaParking className="text-gray-600 mr-2" />
              <p className="text-secondary">Total Spaces: {spot.totalSpaces}</p>
            </div>
            <div className="flex items-center mb-2">
              <Accessible className="text-gray-600 mr-2" />
              <p className="text-secondary">Handicap Spaces: {spot.handicapSpaces}</p>
            </div>
            <div className="flex items-center mb-2">
              <Layers className="text-gray-600 mr-2" />
              <p className="text-secondary">Access: {spot.access}</p>
            </div>
            <div className="flex items-center mb-2">
              <AccessTime className="text-gray-600 mr-2" />
              <p className="text-secondary">Available Now: {spot.availableSpots}</p>
            </div>
            <div className="flex items-center">
              <AccessTime className="text-gray-600 mr-2" />
              <p className="text-secondary">
                Prediction in 1 Hour: {Math.floor(Math.random() * spot.totalSpaces)}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ParkingInfoCard;