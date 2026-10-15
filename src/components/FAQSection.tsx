import React, { useState } from 'react';
import { FAQ_DATA } from '../data/content';
import { ChevronDown, HelpCircle, Search, Sparkles } from 'lucide-react';

export const FAQSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0); // first item open by default
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredFaq = FAQ_DATA.filter(
    (item) =>
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleAccordion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-20 md:py-28 bg-[#121110] border-t border-[#26211C] relative">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#201C18] border border-[#3E3428] text-xs font-mono text-[#8C6207] dark:text-[#D4AF37] mb-3">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Savol-javoblar</span>
          </div>

          <h2 className="font-serif-luxury text-3xl sm:text-5xl font-bold text-[#1A1715] dark:text-[#FAF7F2] tracking-tight mb-4">
            Tez-tez beriladigan savollar
          </h2>

          <p className="text-[#6B6152] dark:text-[#A69C8E] text-base">
            Xizmatlarimiz, tayyor mahsulotlarga logo joylashtirish va hamkorlik shartlari haqida
            eng muhim ma’lumotlar.
          </p>
        </div>

        {/* Quick Search */}
        <div className="relative mb-8 max-w-md mx-auto">
          <Search className="w-4 h-4 text-[#8A8174] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Savollar ichidan qidirish..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-stone-50 dark:bg-[#181614] border border-[#E2DBD1] dark:border-[#2D2620] text-sm text-[#1A1715] dark:text-[#FAF7F2] focus:outline-none focus:border-[#D4AF37]"
          />
        </div>

        {/* FAQ Accordion List */}
        <div className="space-y-3">
          {filteredFaq.map((item, index) => {
            const isOpen = openIndex === index;
            const isQuestionOne = item.question.includes('Siz kiyim tikasizmi');
            return (
              <div
                key={index}
                className={`rounded-2xl border transition-all overflow-hidden ${
                  isOpen
                    ? 'bg-[#1A1815] border-[#D4AF37]/60 shadow-lg'
                    : 'bg-[#161413] border-[#2B251F] hover:border-[#3E342A]'
                } ${isQuestionOne ? 'ring-1 ring-[#D4AF37]/30' : ''}`}
              >
                <button
                  onClick={() => toggleAccordion(index)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 cursor-pointer focus:outline-none"
                >
                  <span
                    className={`font-serif-luxury text-lg font-bold transition-colors ${
                      isOpen ? 'text-[#1A1715] dark:text-[#FAF7F2]' : 'text-[#DDD6CC]'
                    }`}
                  >
                    {item.question}
                  </span>

                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-transform duration-300 ${
                      isOpen
                        ? 'bg-[#D4AF37] text-black rotate-180'
                        : 'bg-[#26201B] text-[#6B6152] dark:text-[#A69C8E]'
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-[#5C554A] dark:text-[#B5ABA0] leading-relaxed border-t border-stone-300 dark:border-white/5 animate-in fade-in duration-200">
                    <p className={isQuestionOne ? 'text-[#1A1715] dark:text-[#F3EFEA] font-medium' : ''}>
                      {item.answer}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
