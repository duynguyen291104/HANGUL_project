import prisma from '../lib/prisma';

/**
 * Generate 10 quiz questions from vocabulary
 * Returns questions with 4 answers each (1 correct + 3 wrong)
 * All answers are from same topic + level
 */
export async function generateQuizQuestions(userId: number, topicId: number, limit: number = 10) {
  try {
    // Step 1: Get user's current level
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Step 2: Get vocabulary for this topic + level
    const vocabularyList = await prisma.vocabulary.findMany({
      where: {
        level: user.level,
        topicId: topicId,
        isActive: true,
      },
      select: {
        id: true,
        korean: true,
        vietnamese: true,
        english: true,
      },
    });

    // Check if enough vocabulary exists
    if (vocabularyList.length < limit) {
      return {
        success: false,
        error: `Not enough vocabulary items. Found: ${vocabularyList.length}, Required: ${limit}`,
        questions: [],
      };
    }

    // Step 3: Random 10 words without repetition
    const shuffled = [...vocabularyList].sort(() => 0.5 - Math.random());
    const selectedVocabs = shuffled.slice(0, limit);

    // Step 4 & 5: Create questions with 4 answers each
    const questions = [];

    for (const vocab of selectedVocabs) {
      // Get 3 wrong answers (different vocabulary from same topic + level)
      const wrongAnswersPool = await prisma.vocabulary.findMany({
        where: {
          level: user.level,
          topicId: topicId,
          id: { not: vocab.id },  // ✅ CRITICAL: Different from correct answer
          isActive: true,
        },
        select: {
          id: true,
          vietnamese: true,
        },
      });

      // Shuffle and pick 3
      const wrongAnswersShuffled = [...wrongAnswersPool].sort(() => 0.5 - Math.random());
      const wrong3 = wrongAnswersShuffled.slice(0, 3);

      // Check uniqueness - ensure all 4 answers are different
      const answers = [
        { text: vocab.vietnamese, isCorrect: true },
        ...wrong3.map((w) => ({
          text: w.vietnamese,
          isCorrect: false,
        })),
      ];

      // ✅ UNIQUE CHECK
      const uniqueAnswers = new Set(answers.map((a) => a.text));
      if (uniqueAnswers.size !== 4) {
        console.warn(`⚠️ Duplicate answers generated for vocab: ${vocab.korean}`);
        continue;
      }

      // Shuffle answers order
      const shuffledAnswers = answers.sort(() => 0.5 - Math.random());

      questions.push({
        vocabularyId: vocab.id,
        korean: vocab.korean,
        english: vocab.english,
        questionText: `"${vocab.korean}" nghĩa là gì?`,
        answers: shuffledAnswers,
        correctAnswerText: vocab.vietnamese,
      });
    }

    return {
      success: true,
      userLevel: user.level,
      topicId: topicId,
      count: questions.length,
      questions,
    };
  } catch (error) {
    console.error('❌ Quiz generation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      questions: [],
    };
  }
}

/**
 * Create persistent quiz question in database
 * Called by admin to create quiz questions manually
 */
export async function createQuizQuestion(data: {
  vocabularyId: number;
  topicId: number;
  questionText: string;
  correctAnswerText: string;
  wrongAnswerIds: number[];
  level: string;
  questionType?: string;
}) {
  try {
    // Validate wrong answers are all different from correct
    if (data.wrongAnswerIds.includes(data.vocabularyId)) {
      throw new Error('Wrong answers cannot include the correct answer');
    }

    // Validate exactly 3 wrong answers
    if (data.wrongAnswerIds.length !== 3) {
      throw new Error('Exactly 3 wrong answers must be provided');
    }

    // Fetch and validate all wrong answers exist
    const wrongAnswers = await prisma.vocabulary.findMany({
      where: {
        id: { in: data.wrongAnswerIds },
        isActive: true,
      },
      select: {
        id: true,
        vietnamese: true,
        level: true,
        topicId: true,
      },
    });

    if (wrongAnswers.length !== 3) {
      throw new Error('Some wrong answers do not exist');
    }

    // Validate all answers are same topic + level
    for (const wrongAnswer of wrongAnswers) {
      if (wrongAnswer.topicId !== data.topicId) {
        throw new Error('All wrong answers must be from same topic');
      }
      if (wrongAnswer.level !== data.level) {
        throw new Error('All wrong answers must be same level');
      }
    }

    // Check uniqueness
    const wrongTexts = wrongAnswers.map((w) => w.vietnamese);
    if (wrongTexts.includes(data.correctAnswerText)) {
      throw new Error('Duplicate answer detected');
    }

    // ✅ Create question
    const quizQuestion = await prisma.quizQuestion.create({
      data: {
        vocabularyId: data.vocabularyId,
        topicId: data.topicId,
        questionText: data.questionText,
        correctAnswerText: data.correctAnswerText,
        wrongAnswerIds: data.wrongAnswerIds,
        level: data.level,
        questionType: data.questionType || 'vocabulary',
        isActive: true,
      },
      include: {
        vocabulary: {
          select: {
            korean: true,
            english: true,
            vietnamese: true,
          },
        },
      },
    });

    return {
      success: true,
      quizQuestion,
    };
  } catch (error) {
    console.error('❌ Create quiz question error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get quiz question by ID with all 4 answers populated
 */
export async function getQuizQuestionWithAnswers(quizQuestionId: number) {
  try {
    const question = await prisma.quizQuestion.findUnique({
      where: { id: quizQuestionId },
      include: {
        vocabulary: {
          select: {
            korean: true,
            english: true,
            vietnamese: true,
          },
        },
      },
    });

    if (!question) {
      throw new Error('Question not found');
    }

    // Fetch wrong answers
    const wrongAnswers = await prisma.vocabulary.findMany({
      where: {
        id: { in: question.wrongAnswerIds },
      },
      select: {
        id: true,
        vietnamese: true,
      },
    });

    // Build answer options
    const answers = [
      { text: question.correctAnswerText, isCorrect: true },
      ...wrongAnswers.map((w) => ({
        text: w.vietnamese,
        isCorrect: false,
      })),
    ];

    // Shuffle
    const shuffledAnswers = answers.sort(() => 0.5 - Math.random());

    return {
      success: true,
      question: {
        id: question.id,
        korean: question.vocabulary.korean,
        english: question.vocabulary.english,
        questionText: question.questionText,
        answers: shuffledAnswers,
        level: question.level,
        topicId: question.topicId,
      },
    };
  } catch (error) {
    console.error('❌ Get quiz question error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
