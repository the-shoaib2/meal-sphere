"use client"
import { Utensils, Users, CreditCard, Bell } from "lucide-react"
import { motion } from "framer-motion"

export default function FeaturesSection() {
  return (
    <section className="w-full py-8 md:py-12 lg:py-16  dark:bg-gray-800 px-4 sm:px-6">
      <div className="mx-auto">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Key Features</h2>
            <p className="max-w-[900px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
              Everything you need to manage meals and costs in shared living spaces
            </p>
          </div>
        </div>
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 mt-8">
          {/* Card 1 */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5, delay: 0 }}
            className="flex flex-col items-center space-y-2 rounded-lg border p-6 shadow-sm transition-transform duration-300 hover:scale-105 hover:shadow-lg bg-muted dark:bg-gray-900/80"
          >
            <div className="rounded-full bg-primary/10 p-3">
              <Utensils className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold">Meal Tracking</h3>
            <p className="text-center text-gray-500 dark:text-gray-400">
              Track daily meals with ease. Mark your breakfast, lunch, and dinner with a simple click.
            </p>
          </motion.div>
          {/* Card 2 */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex flex-col items-center space-y-2 rounded-lg border p-6 shadow-sm transition-transform duration-300 hover:scale-105 hover:shadow-lg bg-muted dark:bg-gray-900/80"
          >
            <div className="rounded-full bg-primary/10 p-3">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold">Room Management</h3>
            <p className="text-center text-gray-500 dark:text-gray-400">
              Create rooms, add members, and elect managers through a democratic voting system.
            </p>
          </motion.div>
          {/* Card 3 */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-col items-center space-y-2 rounded-lg border p-6 shadow-sm transition-transform duration-300 hover:scale-105 hover:shadow-lg bg-muted dark:bg-gray-900/80"
          >
            <div className="rounded-full bg-primary/10 p-3">
              <CreditCard className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold">Payment Integration</h3>
            <p className="text-center text-gray-500 dark:text-gray-400">
              Integrated Bkash payment system for seamless meal cost settlements.
            </p>
          </motion.div>
          {/* Card 4 */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col items-center space-y-2 rounded-lg border p-6 shadow-sm transition-transform duration-300 hover:scale-105 hover:shadow-lg bg-muted dark:bg-gray-900/80"
          >
            <div className="rounded-full bg-primary/10 p-3">
              <Bell className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold">Notifications</h3>
            <p className="text-center text-gray-500 dark:text-gray-400">
              Get timely reminders for meal inputs, voting, and payment deadlines.
            </p>
          </motion.div>
          {/* Card 5 */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-col items-center space-y-2 rounded-lg border p-6 shadow-sm transition-transform duration-300 hover:scale-105 hover:shadow-lg bg-muted dark:bg-gray-900/80"
          >
            <div className="rounded-full bg-primary/10 p-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-6 w-6 text-primary"
              >
                <path d="M3 3v18h18" />
                <path d="m19 9-5 5-4-4-3 3" />
              </svg>
            </div>
            <h3 className="text-xl font-bold">Cost Calculation</h3>
            <p className="text-center text-gray-500 dark:text-gray-400">
              Automatic calculation of meal rates, individual costs, and monthly summaries.
            </p>
          </motion.div>
          {/* Card 6 */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="flex flex-col items-center space-y-2 rounded-lg border p-6 shadow-sm transition-transform duration-300 hover:scale-105 hover:shadow-lg bg-muted dark:bg-gray-900/80"
          >
            <div className="rounded-full bg-primary/10 p-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-6 w-6 text-primary"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
            </div>
            <h3 className="text-xl font-bold">Role-Based Access</h3>
            <p className="text-center text-gray-500 dark:text-gray-400">
              Different access levels for admins, managers, and members with customizable permissions.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  )
} 