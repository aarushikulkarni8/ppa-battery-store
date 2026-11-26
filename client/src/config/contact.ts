/**
 * Details for the "About & contact" page. Fill these in, save, and the page updates.
 * Anything left empty is simply not shown.
 *
 * The main phone number, WhatsApp number, address and hours come from store.ts.
 */
export const CONTACT = {
  /** Shop email shown on the contact page, e.g. 'ppabatteries@gmail.com' */
  email: '',
  /** More phone numbers besides the main one in store.ts, e.g. ['+91 98xxxxxxxx'] */
  otherPhones: [] as string[],

  /** Owner's name as it should appear, e.g. 'Prashant Kulkarni' */
  ownerName: '',
  /** One line under the owner's name, e.g. 'Proprietor' */
  ownerRole: 'Proprietor',
  /** Optional photo of the owner or the shop front (an image URL). */
  photoUrl: '',

  /** A few sentences about the shop, in the owner's words. Leave empty to use the default text. */
  about: '',
  /** Year the shop started, e.g. 2008. Leave as null to hide. */
  since: null as number | null,

  /** Message pre-filled when a customer opens WhatsApp from the site. */
  whatsappMessage: 'Hello, I have a question about a battery.',
};
