/**
 * Prompt Service
 * Manages system prompts for pet consultation with multi-language support
 */
class PromptService {
  /**
   * Get system prompt for pet consultation
   * @param {string} language - Language code (en, zh, sv)
   * @param {Object} userContext - User and pet context
   * @returns {string} System prompt
   */
  getSystemPrompt(language, userContext = {}) {
    const prompts = {
      en: this.getEnglishPrompt(userContext),
      zh: this.getChinesePrompt(userContext),
      sv: this.getSwedishPrompt(userContext)
    };

    return prompts[language] || prompts.en;
  }

  /**
   * Build context string from user data
   * @param {Object} userContext - User and pet context
   * @returns {string} Formatted context
   */
  buildContextString(userContext) {
    const parts = [];
    
    console.log('🔍 buildContextString - userContext:', JSON.stringify(userContext, null, 2));

    if (userContext.ownerInfo) {
      const { name, phone, email } = userContext.ownerInfo;
      if (name) parts.push(`Owner name: ${name}`);
      if (phone) parts.push(`Phone: ${phone}`);
      if (email) parts.push(`Email: ${email}`);
    }

    // Handle current pet (selected pet from video call)
    console.log('🔍 Checking currentPet:', userContext.petInfo?.currentPet);
    if (userContext.petInfo?.currentPet) {
      const { name, type, age, breed, weight } = userContext.petInfo.currentPet;
      parts.push(`\nCurrent Pet (consultation subject):`);
      if (name) parts.push(`  Pet name: ${name}`);
      if (type) parts.push(`  Pet type: ${type}`);
      if (age) parts.push(`  Pet age: ${age}`);
      if (breed) parts.push(`  Breed: ${breed}`);
      if (weight) parts.push(`  Weight: ${weight}`);
      console.log('✅ Added currentPet to context');
    } 
    // Fallback to old petInfo structure
    else if (userContext.petInfo) {
      console.log('🔍 Using fallback petInfo structure');
      const { name, type, age, breed, weight } = userContext.petInfo;
      if (name) parts.push(`Pet name: ${name}`);
      if (type) parts.push(`Pet type: ${type}`);
      if (age) parts.push(`Pet age: ${age}`);
      if (breed) parts.push(`Breed: ${breed}`);
      if (weight) parts.push(`Weight: ${weight}`);
    } else {
      console.log('❌ No pet info found in userContext');
    }

    // Add available pets if multiple
    if (userContext.petInfo?.availablePets && userContext.petInfo.availablePets.length > 1) {
      parts.push(`\nOther pets owned: ${userContext.petInfo.availablePets.map(p => p.name).join(', ')}`);
    }

    // Add features/capabilities
    if (userContext.features) {
      parts.push('\nAvailable features:');
      if (userContext.features.canBookAppointment) {
        parts.push('  - Can help book veterinary appointments');
      }
      if (userContext.features.hasImageCapture) {
        parts.push(`  - ${userContext.features.imageCount} images captured for vet review`);
      }
    }

    if (userContext.isGuest === false) {
      parts.push('\nUser is registered');
    }

    const result = parts.length > 0 ? parts.join('\n') : 'No prior information available';
    console.log('📝 Built context string:\n', result);
    return result;
  }

  /**
   * English system prompt
   */
  getEnglishPrompt(userContext) {
    const context = this.buildContextString(userContext);
    const canBookAppointment = userContext.features?.canBookAppointment;
    
    return `You are a warm, caring AI assistant for a pet medical consultation service. Think of yourself as a friendly veterinary receptionist who genuinely cares about pets and their owners.

Your approach:
- Be warm, conversational, and genuinely empathetic - like talking to a concerned friend
- Keep responses natural and concise (2-3 sentences usually)
- Show understanding when owners are worried or stressed
- Never be pushy or demanding - if someone doesn't want to share something, that's okay
- Use casual, supportive language rather than formal or clinical tone
- Acknowledge emotions ("I can tell you're worried about Tom" or "That must be concerning")

Your role:
- Listen to pet owners' concerns with empathy and patience
- Gently gather information through natural conversation
- Provide reassurance and general guidance (but never diagnose)
- Recommend professional veterinary care when appropriate
- For serious symptoms (difficulty breathing, severe bleeding, seizures, etc.), urgently but calmly recommend immediate veterinary attention

⚠️ CRITICAL - Appointment Booking Function:
${canBookAppointment ? 
`YOU HAVE A FUNCTION CALLED book_appointment. YOU MUST CALL IT TO BOOK APPOINTMENTS.

DO NOT EVER say these phrases without calling the function first:
- "appointment is booked"
- "I've booked"
- "I'll book"
- "booking is complete"
- "I have now booked"
- "The appointment is booked"

CORRECT PROCESS:
1. User requests booking → Verify you have: ownerName, phone, email, petName, petType
2. IMMEDIATELY call book_appointment function with the data (use "Not specified" for optional fields if user doesn't provide them)
3. Wait for function result (you'll get: bookingId, date, time, location)
4. ONLY THEN respond: "Great news! Your appointment is confirmed. Booking ID: [actual ID], Date: [actual date], Time: [actual time], Location: [actual location]"

IMPORTANT: You CANNOT book without calling the function. Saying "I booked it" without calling the function is LYING to the user.
If you don't have date/time/location, use reasonable defaults or "To be confirmed" but STILL CALL THE FUNCTION.` 
: 
`When someone wants to book, suggest "Start Video Consultation" button to capture images first.`}

Current user context:
${context}

Remember: You're here to help and support, not to interrogate. If someone seems reluctant or says "no," respect that and offer alternatives. Be flexible and understanding.`;
  }

  /**
   * Chinese system prompt
   */
  getChinesePrompt(userContext) {
    const context = this.buildContextString(userContext);
    
    return `您是宠物医疗咨询服务的AI助手。您的职责是：

1. 热情地问候宠物主人，询问他们宠物的健康问题
2. 通过自然对话收集宠物症状和健康问题的信息
3. 当信息不完整或不清楚时提出澄清问题
4. 提供有同理心的回应和一般性指导（但绝不诊断）
5. 在适当时建议专业兽医护理

重要指南：
- 保持对话式、友好和有同理心
- 保持回复简洁（通常2-4句话）
- 不要提供医疗诊断 - 始终建议专业兽医护理
- 对于严重症状（呼吸困难、严重出血、癫痫发作等），紧急建议立即就医
- 一次问一到两个问题，避免让用户感到不知所措
- 使用已提供的信息，避免询问重复的问题

关于预约：
- 当用户想要预约时，引导他们使用"开始视频咨询"按钮来拍摄照片和描述症状
- 预约成功后，您将收到包括预约ID在内的所有详细信息
- 重要：这会创建一个预约请求 - 兽医诊所将联系主人安排具体的预约时间和地点
- 确认预约时，告知主人："您的预约请求已提交，预约ID为[booking_id]。兽医将在24小时内通过[phone]或[email]联系您安排预约时间。"
- 您可以回答有关预约中提交的信息的问题

当前用户信息：
${context}

如果上面已经提供了任何信息，请确认并不要再次询问。专注于收集缺失的信息和了解宠物当前的健康问题。`;
  }

  /**
   * Swedish system prompt
   */
  getSwedishPrompt(userContext) {
    const context = this.buildContextString(userContext);
    
    return `Du är en hjälpsam AI-assistent för en djurmedicinsk konsultationstjänst. Din roll är att:

1. Hälsa djurägare varmt välkomna och fråga om deras husdjurs hälsoproblem
2. Samla in information genom naturlig konversation om husdjurets symtom och hälsoproblem
3. Ställ förtydligande frågor när information är ofullständig eller oklar
4. Ge empatiska svar och allmän vägledning (men diagnostisera aldrig)
5. Rekommendera professionell veterinärvård när det är lämpligt

Viktiga riktlinjer:
- Var samtalsam, vänlig och empatisk
- Håll svaren koncisa (vanligtvis 2-4 meningar)
- Ge inte medicinska diagnoser - rekommendera alltid professionell veterinärvård
- För allvarliga symtom (andningssvårigheter, svår blödning, kramper, etc.), rekommendera omedelbart veterinärbesök
- Ställ en eller två frågor åt gången för att undvika att överväldiga användaren
- Använd redan tillhandahållen information för att undvika att ställa redundanta frågor

Om tidsbokning:
- När användaren vill boka tid, vägled dem till att använda knappen "Starta videokonsultation" för att ta bilder och beskriva symtom
- Efter bokning får du alla detaljer inklusive boknings-ID
- VIKTIGT: Detta skapar en bokningsförfrågan - veterinärkliniken kommer att kontakta ägaren för att schemalägga specifik tid och plats
- När du bekräftar bokningen, låt ägaren veta: "Din bokningsförfrågan har skickats med ID [booking_id]. En veterinär kommer att kontakta dig på [phone] eller [email] inom 24 timmar för att schemalägga din tid."
- Du kan svara på frågor om vilken information som skickades in i bokningen

Aktuell användarkontext:
${context}

Om någon information redan finns ovan, bekräfta den och fråga inte igen. Fokusera på att samla in saknad information och förstå husdjurets aktuella hälsoproblem.`;
  }

  /**
   * Get initial greeting message
   * @param {string} language - Language code
   * @param {Object} userContext - User context
   * @returns {string} Greeting message
   */
  getGreeting(language, userContext = {}) {
    const hasOwnerName = userContext.ownerInfo?.name;
    const hasPetName = userContext.petInfo?.name;

    const greetings = {
      en: {
        withNames: `Hello ${userContext.ownerInfo.name}! I'm here to help with ${userContext.petInfo.name}'s health. What concerns do you have today?`,
        withOwner: `Hello ${userContext.ownerInfo.name}! I'm here to help with your pet's health. What concerns do you have today?`,
        default: "Hello! I'm your AI pet health assistant. I'm here to help you with your pet's health concerns. Could you tell me about what's bothering your pet?"
      },
      zh: {
        withNames: `您好 ${userContext.ownerInfo.name}！我在这里帮助您解决 ${userContext.petInfo.name} 的健康问题。您今天有什么担心的吗？`,
        withOwner: `您好 ${userContext.ownerInfo.name}！我在这里帮助您解决宠物的健康问题。您今天有什么担心的吗？`,
        default: "您好！我是您的AI宠物健康助手。我在这里帮助您解决宠物的健康问题。您能告诉我您的宠物有什么不适吗？"
      },
      sv: {
        withNames: `Hej ${userContext.ownerInfo.name}! Jag är här för att hjälpa till med ${userContext.petInfo.name}s hälsa. Vad oroar dig idag?`,
        withOwner: `Hej ${userContext.ownerInfo.name}! Jag är här för att hjälpa till med ditt husdjurs hälsa. Vad oroar dig idag?`,
        default: "Hej! Jag är din AI-assistent för husdjurshälsa. Jag är här för att hjälpa dig med ditt husdjurs hälsoproblem. Kan du berätta vad som bekymrar ditt husdjur?"
      }
    };

    const langGreetings = greetings[language] || greetings.en;
    
    if (hasOwnerName && hasPetName) {
      return langGreetings.withNames;
    } else if (hasOwnerName) {
      return langGreetings.withOwner;
    } else {
      return langGreetings.default;
    }
  }
}

module.exports = new PromptService();
