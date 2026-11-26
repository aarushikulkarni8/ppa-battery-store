/**
 * One-time cleanup: deletes every vehicle make/model and every battery-to-vehicle link,
 * and clears customers' saved vehicles. Orders keep the vehicle text they were placed with.
 *
 *   npm run remove-vehicles
 */
import mongoose from 'mongoose';
import { connectDb } from '../config/db.js';
import { Customer, Vehicle, VehicleCompatibility } from '../models/index.js';

async function run() {
  await connectDb();
  const links = await VehicleCompatibility.deleteMany({});
  const vehicles = await Vehicle.deleteMany({});
  const customers = await Customer.updateMany({}, { $set: { savedVehicles: [] } });
  console.log(`[cleanup] removed ${vehicles.deletedCount} vehicles and ${links.deletedCount} battery links; cleared saved vehicles for ${customers.modifiedCount} customers`);
  await mongoose.disconnect();
}

run().catch(async (e) => {
  console.error(e);
  await mongoose.disconnect();
  process.exit(1);
});
