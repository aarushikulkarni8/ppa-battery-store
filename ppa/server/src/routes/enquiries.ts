import { Router } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import { ENQUIRY_TYPES } from '../config/constants.js';
import { Customer, Enquiry, Product } from '../models/index.js';
import { requireCustomer } from '../middleware/auth.js';
import { newEnquiryNumber } from '../services/ids.js';
import { sendOwnerMail } from '../services/mailer.js';
import { ah, fullName, HttpError, normalizeMobile } from '../utils/http.js';

const router = Router();

router.post(
  '/',
  requireCustomer,
  ah(async (req, res) => {
    const body = z
      .object({
        name: z.string().trim().min(2, 'Enter your name').max(80),
        mobile: z.string(),
        email: z.union([z.string().trim().email('Enter a valid email'), z.literal('')]).optional(),
        orderId: z.string().trim().max(40).optional(),
        productId: z.string().optional(),
        productLabel: z.string().trim().max(160).optional(),
        enquiryType: z.enum(ENQUIRY_TYPES),
        message: z.string().trim().min(5, 'Tell us a little more').max(3000),
      })
      .parse(req.body);
    const mobile = normalizeMobile(body.mobile);
    if (!mobile) throw new HttpError(400, 'Enter a valid 10-digit mobile number');

    let productLabel = body.productLabel ?? '';
    let product: Types.ObjectId | null = null;
    if (body.productId && Types.ObjectId.isValid(body.productId)) {
      const p = await Product.findById(body.productId).populate('brand', 'name').lean();
      if (p) {
        product = p._id;
        productLabel = `${fullName((p.brand as any)?.name, p.name)} (${p.model})`;
      }
    }

    const enquiry = await Enquiry.create({
      enquiryNumber: newEnquiryNumber(),
      customer: req.customerId,
      name: body.name,
      mobile,
      email: body.email ?? '',
      orderId: body.orderId ?? '',
      product,
      productLabel,
      enquiryType: body.enquiryType,
      message: body.message,
    });

    const customer = await Customer.findById(req.customerId).select('name email').lean();
    if (customer && (!customer.name || (!customer.email && body.email))) {
      await Customer.updateOne(
        { _id: req.customerId },
        { $set: { ...(customer.name ? {} : { name: body.name }), ...(!customer.email && body.email ? { email: body.email } : {}) } },
      );
    }

    try {
      const r = await sendOwnerMail(`New enquiry ${enquiry.enquiryNumber}: ${enquiry.enquiryType}`, 'NEW CUSTOMER ENQUIRY', [
        ['Enquiry No.', enquiry.enquiryNumber],
        ['Customer', enquiry.name],
        ['Mobile', `+91 ${enquiry.mobile}`],
        ['Email', enquiry.email],
        ['Order ID', enquiry.orderId],
        ['Product', enquiry.productLabel],
        ['Enquiry Type', enquiry.enquiryType],
        ['Message', enquiry.message],
      ]);
      enquiry.emailStatus = r.status;
    } catch (e) {
      enquiry.emailStatus = 'FAILED';
      enquiry.emailError = (e as Error).message.slice(0, 500);
      console.error('[mail] enquiry email failed:', (e as Error).message);
    }
    await enquiry.save();

    res.status(201).json({
      message: 'Your enquiry has been submitted successfully.',
      enquiryNumber: enquiry.enquiryNumber,
    });
  }),
);

export default router;
