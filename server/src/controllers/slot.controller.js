const Slot = require('../models/Slot'); 
const ApiResponse = require('../utils/ApiResponse'); 
const ApiError = require('../utils/ApiError');

const dateFor = (date) => { 
  const value = new Date(`${date}T00:00:00.000Z`); 
  if (Number.isNaN(value.getTime()) || date !== value.toISOString().slice(0, 10)) 
    throw new ApiError(400, 'Please provide a valid date.'); 
  return value; 
};

const validateSlot = async ({ date, startTime, endTime, vehicleId }, instructorId, excludeId) => { 
  const day = dateFor(date); 
  
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime || '') || 
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime || '') || 
      startTime >= endTime) 
    throw new ApiError(400, 'Start time must be before end time.'); 
  
  if (new Date(`${date}T${startTime}:00`) <= new Date()) 
    throw new ApiError(400, 'Past availability cannot be created.'); 
  
  const overlap = await Slot.exists({ 
    instructorId, 
    date: day, 
    status: 'available', 
    ...(excludeId ? { _id: { $ne: excludeId } } : {}), 
    startTime: { $lt: endTime }, 
    endTime: { $gt: startTime } 
  }); 
  
  if (overlap) throw new ApiError(409, 'Availability overlaps an existing slot.'); 
  
  return day; 
};

const createSlot = async (req, res, next) => { 
  try { 
    const date = await validateSlot(req.body, req.user.id); 
    const slot = await Slot.create({ ...req.body, date, instructorId: req.user.id }); 
    res.status(201).json(new ApiResponse(201, { slot }, 'Availability slot created.')); 
  } catch (error) { 
    next(error); 
  } 
};

const getMySlots = async (req, res, next) => { 
  try { 
    const slots = await Slot.find({ instructorId: req.user.id })
      .sort({ date: 1, startTime: 1 }); 
    res.json(new ApiResponse(200, { slots }, 'Availability slots fetched.')); 
  } catch (error) { 
    next(error); 
  } 
};

const updateSlot = async (req, res, next) => { 
  try { 
    const slot = await Slot.findOne({ _id: req.params.id, instructorId: req.user.id }); 
    if (!slot) throw new ApiError(404, 'Availability slot not found.'); 
    if (slot.status === 'booked') throw new ApiError(409, 'Booked availability cannot be changed.'); 
    
    const candidate = { 
      date: req.body.date || slot.date.toISOString().slice(0, 10), 
      startTime: req.body.startTime || slot.startTime, 
      endTime: req.body.endTime || slot.endTime, 
      vehicleId: req.body.vehicleId === undefined ? slot.vehicleId : req.body.vehicleId 
    }; 
    
    const date = await validateSlot(candidate, req.user.id, slot._id); 
    Object.assign(slot, req.body, { date }); 
    await slot.save(); 
    res.json(new ApiResponse(200, { slot }, 'Availability slot updated.')); 
  } catch (error) { 
    next(error); 
  } 
};

const deleteSlot = async (req, res, next) => { 
  try { 
    const slot = await Slot.findOne({ _id: req.params.id, instructorId: req.user.id }); 
    if (!slot) throw new ApiError(404, 'Availability slot not found.'); 
    if (slot.status === 'booked') throw new ApiError(409, 'Booked availability cannot be deleted.'); 
    await slot.deleteOne(); 
    res.json(new ApiResponse(200, null, 'Availability slot deleted.')); 
  } catch (error) { 
    next(error); 
  } 
};

module.exports = { createSlot, getMySlots, updateSlot, deleteSlot };
