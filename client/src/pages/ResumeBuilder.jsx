import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiFileText,
  FiDownload,
  FiCheckCircle,
  FiClock,
  FiPlus,
  FiTrash2,
  FiTarget,
  FiBriefcase,
  FiCode,
  FiBookOpen,
  FiAward,
  FiUser,
} from 'react-icons/fi';

import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import Skeleton from '../components/ui/Skeleton.jsx';
import Chip from '../components/ui/Chip.jsx';
import CircularProgress from '../components/ui/CircularProgress.jsx';
import ProgressBar from '../components/ui/ProgressBar.jsx';

import { useToast } from '../context/ToastContext.jsx';
import { buildResume, exportResume } from '../services/api.js';
import {
  saveActivity,
  ACTIVITY_TYPES,
  timeAgo,
} from '../utils/recentActivity.js';

const BREAKDOWN_LABELS = {
  keywordMatch: 'Keyword Match',
  skillsMatch: 'Skills Match',
  experience: 'Experience',
  projects: 'Projects',
  formatting: 'Formatting',
  grammar: 'Grammar',
  education: 'Education',
  achievements: 'Achievements',
  actionVerbs: 'Action Verbs',
};

const emptyEducation = {
  degree: '',
  institution: '',
  location: '',
  startDate: '',
  endDate: '',
  score: '',
  coursework: '',
};

const emptyExperience = {
  jobTitle: '',
  company: '',
  location: '',
  startDate: '',
  endDate: '',
  description: '',
};

const emptyProject = {
  name: '',
  type: '',
  technologies: '',
  github: '',
  liveDemo: '',
  description: '',
};

const emptyCertification = {
  name: '',
  organization: '',
  date: '',
};

const initialForm = {
  name: '',
  email: '',
  phone: '',
  location: '',
  linkedin: '',
  github: '',
  portfolio: '',

  targetRole: '',

  summary: '',

  skills: {
    programmingLanguages: '',
    frontend: '',
    backend: '',
    databases: '',
    dataAI: '',
    cloudDevOps: '',
    tools: '',
  },

  education: [{ ...emptyEducation }],

  experience: [{ ...emptyExperience }],

  projects: [{ ...emptyProject }],

  certifications: [{ ...emptyCertification }],

  achievements: '',

  languages: '',

  optimization: {
    prioritizeJDKeywords: true,
    prioritizeRelevantProjects: true,
    prioritizeRelevantExperience: true,
    includeATSKeywords: true,
    onePageResume: true,
  },
};

function SectionHeader({ icon, title, description }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2">
        <span className="text-brand-600">{icon}</span>
        <h3 className="font-semibold text-lg">{title}</h3>
      </div>

      {description && (
        <p className="text-xs text-slate-500 mt-1">
          {description}
        </p>
      )}
    </div>
  );
}

function Field({ label, name, value, onChange, placeholder, required = false }) {
  return (
    <div>
      <label className="text-sm font-medium mb-1.5 block">
        {label}{' '}
        {required && <span className="text-rose-500">*</span>}
      </label>

      <input
        className="input-field"
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
      />
    </div>
  );
}

function TextArea({
  label,
  name,
  value,
  onChange,
  placeholder,
  minHeight = 'min-h-[100px]',
}) {
  return (
    <div>
      <label className="text-sm font-medium mb-1.5 block">
        {label}
      </label>

      <textarea
        className={`input-field ${minHeight}`}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
    </div>
  );
}

function AddRemoveButtons({ onAdd, onRemove, showRemove = true }) {
  return (
    <div className="flex gap-2">
      <Button
        type="button"
        variant="secondary"
        icon={<FiPlus />}
        onClick={onAdd}
      >
        Add
      </Button>

      {showRemove && (
        <Button
          type="button"
          variant="secondary"
          icon={<FiTrash2 />}
          onClick={onRemove}
        >
          Remove
        </Button>
      )}
    </div>
  );
}

export default function ResumeBuilder() {
  const toast = useToast();
  const location = useLocation();

  const [jobDescription, setJobDescription] = useState('');
  const [form, setForm] = useState(initialForm);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [restoredFrom, setRestoredFrom] = useState(null);

  useEffect(() => {
    const restored = location.state?.restoredActivity;

    if (restored?.data) {
      setJobDescription(restored.data.jobDescription || '');
      setForm(restored.data.form || initialForm);
      setResult(restored.data.result || null);
      setRestoredFrom(restored.timestamp);

      toast.info(
        `Restored resume from ${timeAgo(restored.timestamp)}`
      );
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const updateSkill = (field, value) => {
    setForm((current) => ({
      ...current,
      skills: {
        ...current.skills,
        [field]: value,
      },
    }));
  };

  const updateOptimization = (field, value) => {
    setForm((current) => ({
      ...current,
      optimization: {
        ...current.optimization,
        [field]: value,
      },
    }));
  };

  const updateArrayItem = (section, index, field, value) => {
    setForm((current) => ({
      ...current,
      [section]: current[section].map((item, i) =>
        i === index
          ? {
              ...item,
              [field]: value,
            }
          : item
      ),
    }));
  };

  const addArrayItem = (section, template) => {
    setForm((current) => ({
      ...current,
      [section]: [
        ...current[section],
        { ...template },
      ],
    }));
  };

  const removeArrayItem = (section, index) => {
    setForm((current) => ({
      ...current,
      [section]: current[section].filter(
        (_, i) => i !== index
      ),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim() || !form.email.trim()) {
      toast.error('Name and Email are required.');
      return;
    }

    if (!jobDescription.trim()) {
      toast.error('Please paste the job description.');
      return;
    }

    setLoading(true);
    setResult(null);
    setRestoredFrom(null);

    try {
      const payload = {
        jobDescription,
        targetRole: form.targetRole,

        personalInformation: {
          name: form.name,
          email: form.email,
          phone: form.phone,
          location: form.location,
          linkedin: form.linkedin,
          github: form.github,
          portfolio: form.portfolio,
        },

        summary: form.summary,

        education: form.education,

        skills: form.skills,

        experience: form.experience,

        projects: form.projects,

        certifications: form.certifications,

        achievements: form.achievements,

        languages: form.languages,

        optimization: form.optimization,
      };

      const res = await buildResume(payload);

      setResult(res.data);

      toast.success(
        'ATS-optimized resume generated successfully!'
      );

      saveActivity({
        type: ACTIVITY_TYPES.BUILD,
        summary: `${
          form.name || 'Untitled'
        } — Score ${
          res.data.atsPreview?.score ?? '—'
        }/100`,
        data: {
          jobDescription,
          form,
          result: res.data,
        },
      });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    try {
      await exportResume({
        resumeText: result.resumeText,
        format,
      });

      toast.success(
        `Downloaded as ${format.toUpperCase()}`
      );
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="page-container py-16">

      {/* HEADER */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-3xl mx-auto mb-12"
      >
        <span className="section-label">
          ATS Resume Builder
        </span>

        <h1 className="text-3xl md:text-4xl font-bold mt-3">
          Build a resume tailored to the job
        </h1>

        <p className="text-slate-500 mt-3">
          Paste the job description, provide your real
          experience and skills, and we'll match your
          profile against the role to create an
          ATS-friendly resume.
        </p>
      </motion.div>

      <div className="grid xl:grid-cols-2 gap-8">

        {/* ================= FORM ================= */}

        <Card as="div">

          <form
            onSubmit={handleSubmit}
            className="space-y-8"
          >

            {/* TARGET JOB */}

            <div>
              <SectionHeader
                icon={<FiTarget />}
                title="Target Job"
                description="The job description is the primary source for ATS keyword matching."
              />

              <div className="space-y-4">

                <Field
                  label="Target Job Title"
                  value={form.targetRole}
                  onChange={(e) =>
                    updateField(
                      'targetRole',
                      e.target.value
                    )
                  }
                  placeholder="e.g. Software Engineer Intern"
                />

                <TextArea
                  label="Job Description"
                  value={jobDescription}
                  onChange={(e) =>
                    setJobDescription(e.target.value)
                  }
                  placeholder="Paste the complete job description here..."
                  minHeight="min-h-[220px]"
                />

              </div>
            </div>


            {/* PERSONAL INFORMATION */}

            <div>
              <SectionHeader
                icon={<FiUser />}
                title="Personal Information"
                description="Keep this section clean and ATS-readable."
              />

              <div className="grid sm:grid-cols-2 gap-4">

                <Field
                  label="Full Name"
                  value={form.name}
                  onChange={(e) =>
                    updateField('name', e.target.value)
                  }
                  placeholder="Lal Mohan Saw"
                  required
                />

                <Field
                  label="Email"
                  value={form.email}
                  onChange={(e) =>
                    updateField('email', e.target.value)
                  }
                  placeholder="you@example.com"
                  required
                />

                <Field
                  label="Phone"
                  value={form.phone}
                  onChange={(e) =>
                    updateField('phone', e.target.value)
                  }
                  placeholder="+91 XXXXX XXXXX"
                />

                <Field
                  label="Location"
                  value={form.location}
                  onChange={(e) =>
                    updateField(
                      'location',
                      e.target.value
                    )
                  }
                  placeholder="Pune, India"
                />

                <Field
                  label="LinkedIn URL"
                  value={form.linkedin}
                  onChange={(e) =>
                    updateField(
                      'linkedin',
                      e.target.value
                    )
                  }
                  placeholder="linkedin.com/in/..."
                />

                <Field
                  label="GitHub URL"
                  value={form.github}
                  onChange={(e) =>
                    updateField(
                      'github',
                      e.target.value
                    )
                  }
                  placeholder="github.com/..."
                />

                <div className="sm:col-span-2">

                  <Field
                    label="Portfolio URL"
                    value={form.portfolio}
                    onChange={(e) =>
                      updateField(
                        'portfolio',
                        e.target.value
                      )
                    }
                    placeholder="https://..."
                  />

                </div>

              </div>
            </div>


            {/* SUMMARY */}

            <div>

              <SectionHeader
                icon={<FiFileText />}
                title="Professional Background"
                description="Tell the AI about your background. The final summary will be tailored to the JD."
              />

              <TextArea
                label="Your Background"
                value={form.summary}
                onChange={(e) =>
                  updateField(
                    'summary',
                    e.target.value
                  )
                }
                placeholder="Example: Full-stack developer with experience building web applications using React, Node.js, Express.js and MongoDB..."
                minHeight="min-h-[130px]"
              />

            </div>


            {/* EDUCATION */}

            <div>

              <SectionHeader
                icon={<FiBookOpen />}
                title="Education"
                description="Add your degrees, diplomas or relevant education."
              />

              <div className="space-y-5">

                {form.education.map(
                  (education, index) => (

                    <div
                      key={index}
                      className="border rounded-xl p-4 space-y-4 bg-slate-50/50 dark:bg-white/[0.02]"
                    >

                      <div className="flex justify-between">

                        <h4 className="font-medium">
                          Education {index + 1}
                        </h4>

                        {form.education.length > 1 && (
                          <button
                            type="button"
                            className="text-rose-500"
                            onClick={() =>
                              removeArrayItem(
                                'education',
                                index
                              )
                            }
                          >
                            <FiTrash2 />
                          </button>
                        )}

                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">

                        <Field
                          label="Degree"
                          value={education.degree}
                          onChange={(e) =>
                            updateArrayItem(
                              'education',
                              index,
                              'degree',
                              e.target.value
                            )
                          }
                          placeholder="B.E. Computer Engineering"
                        />

                        <Field
                          label="Institution"
                          value={
                            education.institution
                          }
                          onChange={(e) =>
                            updateArrayItem(
                              'education',
                              index,
                              'institution',
                              e.target.value
                            )
                          }
                          placeholder="College / University"
                        />

                        <Field
                          label="Location"
                          value={education.location}
                          onChange={(e) =>
                            updateArrayItem(
                              'education',
                              index,
                              'location',
                              e.target.value
                            )
                          }
                          placeholder="Pune, India"
                        />

                        <Field
                          label="CGPA / Percentage"
                          value={education.score}
                          onChange={(e) =>
                            updateArrayItem(
                              'education',
                              index,
                              'score',
                              e.target.value
                            )
                          }
                          placeholder="7.68 / 10"
                        />

                        <Field
                          label="Start Date"
                          value={
                            education.startDate
                          }
                          onChange={(e) =>
                            updateArrayItem(
                              'education',
                              index,
                              'startDate',
                              e.target.value
                            )
                          }
                          placeholder="2022"
                        />

                        <Field
                          label="End Date"
                          value={education.endDate}
                          onChange={(e) =>
                            updateArrayItem(
                              'education',
                              index,
                              'endDate',
                              e.target.value
                            )
                          }
                          placeholder="2026"
                        />

                      </div>

                      <TextArea
                        label="Relevant Coursework"
                        value={
                          education.coursework
                        }
                        onChange={(e) =>
                          updateArrayItem(
                            'education',
                            index,
                            'coursework',
                            e.target.value
                          )
                        }
                        placeholder="Data Structures, DBMS, Operating Systems, Computer Networks..."
                        minHeight="min-h-[80px]"
                      />

                    </div>

                  )
                )}

                <AddRemoveButtons
                  onAdd={() =>
                    addArrayItem(
                      'education',
                      emptyEducation
                    )
                  }
                  showRemove={false}
                />

              </div>

            </div>


            {/* SKILLS */}

            <div>

              <SectionHeader
                icon={<FiCode />}
                title="Complete Skill Bank"
                description="Enter every technology you genuinely know. The AI will select the most relevant skills for the target JD."
              />

              <div className="space-y-4">

                <TextArea
                  label="Programming Languages"
                  value={
                    form.skills.programmingLanguages
                  }
                  onChange={(e) =>
                    updateSkill(
                      'programmingLanguages',
                      e.target.value
                    )
                  }
                  placeholder="Python, JavaScript, Java, C++, SQL"
                  minHeight="min-h-[70px]"
                />

                <TextArea
                  label="Frontend"
                  value={form.skills.frontend}
                  onChange={(e) =>
                    updateSkill(
                      'frontend',
                      e.target.value
                    )
                  }
                  placeholder="React.js, Next.js, HTML5, CSS3, Tailwind CSS"
                  minHeight="min-h-[70px]"
                />

                <TextArea
                  label="Backend"
                  value={form.skills.backend}
                  onChange={(e) =>
                    updateSkill(
                      'backend',
                      e.target.value
                    )
                  }
                  placeholder="Node.js, Express.js, REST APIs, Django, Flask"
                  minHeight="min-h-[70px]"
                />

                <TextArea
                  label="Databases"
                  value={form.skills.databases}
                  onChange={(e) =>
                    updateSkill(
                      'databases',
                      e.target.value
                    )
                  }
                  placeholder="MongoDB, MySQL, PostgreSQL, Redis"
                  minHeight="min-h-[70px]"
                />

                <TextArea
                  label="Data / AI / Machine Learning"
                  value={form.skills.dataAI}
                  onChange={(e) =>
                    updateSkill(
                      'dataAI',
                      e.target.value
                    )
                  }
                  placeholder="Python, NumPy, Pandas, Scikit-learn, Machine Learning"
                  minHeight="min-h-[70px]"
                />

                <TextArea
                  label="Cloud / DevOps"
                  value={form.skills.cloudDevOps}
                  onChange={(e) =>
                    updateSkill(
                      'cloudDevOps',
                      e.target.value
                    )
                  }
                  placeholder="AWS, Docker, Kubernetes, CI/CD"
                  minHeight="min-h-[70px]"
                />

                <TextArea
                  label="Tools"
                  value={form.skills.tools}
                  onChange={(e) =>
                    updateSkill(
                      'tools',
                      e.target.value
                    )
                  }
                  placeholder="Git, GitHub, Postman, Power BI, VS Code"
                  minHeight="min-h-[70px]"
                />

              </div>

            </div>


            {/* EXPERIENCE */}

            <div>

              <SectionHeader
                icon={<FiBriefcase />}
                title="Experience"
                description="Add internships, freelance work, jobs or relevant practical experience."
              />

              <div className="space-y-5">

                {form.experience.map(
                  (experience, index) => (

                    <div
                      key={index}
                      className="border rounded-xl p-4 space-y-4 bg-slate-50/50 dark:bg-white/[0.02]"
                    >

                      <div className="flex justify-between">

                        <h4 className="font-medium">
                          Experience {index + 1}
                        </h4>

                        {form.experience.length > 1 && (
                          <button
                            type="button"
                            className="text-rose-500"
                            onClick={() =>
                              removeArrayItem(
                                'experience',
                                index
                              )
                            }
                          >
                            <FiTrash2 />
                          </button>
                        )}

                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">

                        <Field
                          label="Job Title"
                          value={
                            experience.jobTitle
                          }
                          onChange={(e) =>
                            updateArrayItem(
                              'experience',
                              index,
                              'jobTitle',
                              e.target.value
                            )
                          }
                          placeholder="Full Stack Developer Intern"
                        />

                        <Field
                          label="Company"
                          value={
                            experience.company
                          }
                          onChange={(e) =>
                            updateArrayItem(
                              'experience',
                              index,
                              'company',
                              e.target.value
                            )
                          }
                          placeholder="Company Name"
                        />

                        <Field
                          label="Location"
                          value={
                            experience.location
                          }
                          onChange={(e) =>
                            updateArrayItem(
                              'experience',
                              index,
                              'location',
                              e.target.value
                            )
                          }
                          placeholder="Remote / Pune"
                        />

                        <Field
                          label="Start Date"
                          value={
                            experience.startDate
                          }
                          onChange={(e) =>
                            updateArrayItem(
                              'experience',
                              index,
                              'startDate',
                              e.target.value
                            )
                          }
                          placeholder="Jan 2026"
                        />

                        <Field
                          label="End Date"
                          value={
                            experience.endDate
                          }
                          onChange={(e) =>
                            updateArrayItem(
                              'experience',
                              index,
                              'endDate',
                              e.target.value
                            )
                          }
                          placeholder="Mar 2026 / Present"
                        />

                      </div>

                      <TextArea
                        label="Responsibilities & Achievements"
                        value={
                          experience.description
                        }
                        onChange={(e) =>
                          updateArrayItem(
                            'experience',
                            index,
                            'description',
                            e.target.value
                          )
                        }
                        placeholder="Describe what you built, technologies used, measurable results, responsibilities and achievements."
                        minHeight="min-h-[130px]"
                      />

                    </div>

                  )
                )}

                <AddRemoveButtons
                  onAdd={() =>
                    addArrayItem(
                      'experience',
                      emptyExperience
                    )
                  }
                  showRemove={false}
                />

              </div>

            </div>


            {/* PROJECTS */}

            <div>

              <SectionHeader
                icon={<FiCode />}
                title="Projects"
                description="Add your complete project bank. The builder will prioritize projects relevant to the JD."
              />

              <div className="space-y-5">

                {form.projects.map(
                  (project, index) => (

                    <div
                      key={index}
                      className="border rounded-xl p-4 space-y-4 bg-slate-50/50 dark:bg-white/[0.02]"
                    >

                      <div className="flex justify-between">

                        <h4 className="font-medium">
                          Project {index + 1}
                        </h4>

                        {form.projects.length > 1 && (
                          <button
                            type="button"
                            className="text-rose-500"
                            onClick={() =>
                              removeArrayItem(
                                'projects',
                                index
                              )
                            }
                          >
                            <FiTrash2 />
                          </button>
                        )}

                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">

                        <Field
                          label="Project Name"
                          value={project.name}
                          onChange={(e) =>
                            updateArrayItem(
                              'projects',
                              index,
                              'name',
                              e.target.value
                            )
                          }
                          placeholder="Resume ATS Optimizer"
                        />

                        <Field
                          label="Project Type"
                          value={project.type}
                          onChange={(e) =>
                            updateArrayItem(
                              'projects',
                              index,
                              'type',
                              e.target.value
                            )
                          }
                          placeholder="Full Stack Web Application"
                        />

                        <Field
                          label="Technologies"
                          value={
                            project.technologies
                          }
                          onChange={(e) =>
                            updateArrayItem(
                              'projects',
                              index,
                              'technologies',
                              e.target.value
                            )
                          }
                          placeholder="React, Node.js, MongoDB"
                        />

                        <Field
                          label="GitHub URL"
                          value={project.github}
                          onChange={(e) =>
                            updateArrayItem(
                              'projects',
                              index,
                              'github',
                              e.target.value
                            )
                          }
                          placeholder="github.com/..."
                        />

                        <div className="sm:col-span-2">

                          <Field
                            label="Live Demo"
                            value={
                              project.liveDemo
                            }
                            onChange={(e) =>
                              updateArrayItem(
                                'projects',
                                index,
                                'liveDemo',
                                e.target.value
                              )
                            }
                            placeholder="https://..."
                          />

                        </div>

                      </div>

                      <TextArea
                        label="Project Description"
                        value={
                          project.description
                        }
                        onChange={(e) =>
                          updateArrayItem(
                            'projects',
                            index,
                            'description',
                            e.target.value
                          )
                        }
                        placeholder="Describe features, technical implementation, APIs, databases, performance improvements and measurable outcomes."
                        minHeight="min-h-[130px]"
                      />

                    </div>

                  )
                )}

                <AddRemoveButtons
                  onAdd={() =>
                    addArrayItem(
                      'projects',
                      emptyProject
                    )
                  }
                  showRemove={false}
                />

              </div>

            </div>


            {/* CERTIFICATIONS */}

            <div>

              <SectionHeader
                icon={<FiAward />}
                title="Certifications"
                description="Add certifications that are relevant to your target role."
              />

              <div className="space-y-4">

                {form.certifications.map(
                  (certification, index) => (

                    <div
                      key={index}
                      className="border rounded-xl p-4"
                    >

                      <div className="flex justify-between mb-4">

                        <h4 className="font-medium">
                          Certification {index + 1}
                        </h4>

                        {form.certifications.length > 1 && (
                          <button
                            type="button"
                            className="text-rose-500"
                            onClick={() =>
                              removeArrayItem(
                                'certifications',
                                index
                              )
                            }
                          >
                            <FiTrash2 />
                          </button>
                        )}

                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">

                        <Field
                          label="Certification"
                          value={certification.name}
                          onChange={(e) =>
                            updateArrayItem(
                              'certifications',
                              index,
                              'name',
                              e.target.value
                            )
                          }
                          placeholder="AWS Cloud Practitioner"
                        />

                        <Field
                          label="Organization"
                          value={
                            certification.organization
                          }
                          onChange={(e) =>
                            updateArrayItem(
                              'certifications',
                              index,
                              'organization',
                              e.target.value
                            )
                          }
                          placeholder="AWS"
                        />

                        <Field
                          label="Date"
                          value={certification.date}
                          onChange={(e) =>
                            updateArrayItem(
                              'certifications',
                              index,
                              'date',
                              e.target.value
                            )
                          }
                          placeholder="Jan 2026"
                        />

                      </div>

                    </div>

                  )
                )}

                <AddRemoveButtons
                  onAdd={() =>
                    addArrayItem(
                      'certifications',
                      emptyCertification
                    )
                  }
                  showRemove={false}
                />

              </div>

            </div>


            {/* ACHIEVEMENTS */}

            <div>

              <SectionHeader
                icon={<FiAward />}
                title="Achievements"
              />

              <TextArea
                label="Achievements & Extracurriculars"
                value={form.achievements}
                onChange={(e) =>
                  updateField(
                    'achievements',
                    e.target.value
                  )
                }
                placeholder="Examples: mentored 15+ students, solved 200+ DSA problems, hackathon achievements, academic achievements..."
                minHeight="min-h-[110px]"
              />

            </div>


            {/* LANGUAGES */}

            <div>

              <TextArea
                label="Languages"
                value={form.languages}
                onChange={(e) =>
                  updateField(
                    'languages',
                    e.target.value
                  )
                }
                placeholder="English, Hindi, Marathi"
                minHeight="min-h-[70px]"
              />

            </div>


            {/* OPTIMIZATION */}

            <div>

              <SectionHeader
                icon={<FiTarget />}
                title="ATS Optimization"
                description="These controls determine how the AI prioritizes your genuine information."
              />

              <div className="space-y-3">

                {[
                  [
                    'prioritizeJDKeywords',
                    'Prioritize JD keywords',
                  ],
                  [
                    'prioritizeRelevantProjects',
                    'Prioritize projects relevant to the JD',
                  ],
                  [
                    'prioritizeRelevantExperience',
                    'Prioritize relevant experience',
                  ],
                  [
                    'includeATSKeywords',
                    'Include relevant ATS keywords',
                  ],
                  [
                    'onePageResume',
                    'Prefer a one-page resume',
                  ],
                ].map(([key, label]) => (

                  <label
                    key={key}
                    className="flex items-center gap-3 text-sm cursor-pointer"
                  >

                    <input
                      type="checkbox"
                      checked={
                        form.optimization[key]
                      }
                      onChange={(e) =>
                        updateOptimization(
                          key,
                          e.target.checked
                        )
                      }
                      className="rounded"
                    />

                    <span>{label}</span>

                  </label>

                ))}

              </div>

              <div className="mt-4 p-4 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-xs text-slate-600 dark:text-slate-300">

                <strong>Important:</strong> The builder
                should never add a skill, technology,
                certification or experience that the
                candidate has not actually provided.

              </div>

            </div>


            {/* GENERATE */}

            <Button
              type="submit"
              loading={loading}
              icon={<FiFileText />}
              className="w-full"
            >
              Generate ATS-Optimized Resume
            </Button>

          </form>

        </Card>


        {/* ================= RESULT ================= */}

        <Card className="h-fit sticky top-6">

          <h3 className="font-semibold text-lg mb-1 flex items-center gap-2">

            <FiCheckCircle className="text-brand-600" />

            Generated Resume

          </h3>

          {restoredFrom && (
            <p className="text-xs text-slate-400 mb-3 flex items-center gap-1">

              <FiClock size={12} />

              Restored from {timeAgo(restoredFrom)}

            </p>
          )}

          {loading && (
            <div className="space-y-4">

              <div className="p-4 rounded-xl bg-brand-50 dark:bg-brand-500/10">

                <p className="text-sm font-medium">
                  Analyzing job description...
                </p>

                <p className="text-xs text-slate-500 mt-1">
                  Matching your skills, projects and
                  experience against the role.
                </p>

              </div>

              <Skeleton rows={12} />

            </div>
          )}

          {!loading && !result && (
            <div className="py-16 text-center">

              <FiFileText
                size={40}
                className="mx-auto text-slate-300 mb-4"
              />

              <p className="text-sm text-slate-400">
                Your tailored resume will appear here.
              </p>

              <p className="text-xs text-slate-400 mt-2">
                Add your JD and candidate information,
                then generate your resume.
              </p>

            </div>
          )}

          {!loading && result && (
            <>

              {result.atsPreview && (

                <div className="mb-5 p-4 rounded-xl bg-slate-50 dark:bg-white/5">

                  <div className="flex items-center gap-3">

                    <CircularProgress
                      value={
                        result.atsPreview.score
                      }
                      size={90}
                      strokeWidth={8}
                    />

                    <div>

                      <p className="font-semibold">
                        ATS Score
                      </p>

                      <p className="text-2xl font-bold text-brand-600">
                        {result.atsPreview.score}/100
                      </p>

                      <p className="text-xs text-slate-500">
                        {result.atsPreview.quality}
                      </p>

                    </div>

                  </div>

                </div>

              )}

              <pre className="whitespace-pre-wrap text-sm bg-slate-50 dark:bg-white/5 rounded-xl p-4 max-h-[600px] overflow-y-auto font-sans">

                {result.resumeText}

              </pre>

              <div className="flex flex-wrap gap-3 mt-4">

                <Button
                  variant="secondary"
                  icon={<FiDownload />}
                  onClick={() =>
                    handleExport('pdf')
                  }
                >
                  PDF
                </Button>

                <Button
                  variant="secondary"
                  icon={<FiDownload />}
                  onClick={() =>
                    handleExport('docx')
                  }
                >
                  DOCX
                </Button>

                <Button
                  variant="secondary"
                  icon={<FiDownload />}
                  onClick={() =>
                    handleExport('txt')
                  }
                >
                  TXT
                </Button>

              </div>

            </>
          )}

        </Card>

      </div>


      {/* ================= ATS ANALYSIS ================= */}

      {!loading &&
        result?.atsPreview?.breakdown && (

          <div className="max-w-5xl mx-auto mt-8 space-y-6">

            <Card className="grid md:grid-cols-2 gap-8 items-center">

              <div className="flex justify-center">

                <CircularProgress
                  value={
                    result.atsPreview.score
                  }
                  size={160}
                  strokeWidth={12}
                  label={`Quality: ${result.atsPreview.quality}`}
                />

              </div>

              <div className="space-y-3">

                {Object.entries(
                  result.atsPreview.breakdown
                ).map(([key, val]) => (

                  <ProgressBar
                    key={key}
                    label={`${BREAKDOWN_LABELS[key] || key} (${val.weight}%)`}
                    value={val.score}
                  />

                ))}

              </div>

            </Card>


            {/* KEYWORD ANALYSIS */}

            {(
              result.atsPreview.keywordAnalysis
                ?.criticalMissing?.length > 0 ||
              result.atsPreview.keywordAnalysis
                ?.missing?.length > 0
            ) && (

              <Card>

                <h3 className="font-semibold mb-2">
                  JD Keyword Analysis
                </h3>

                <p className="text-xs text-slate-400 mb-4">

                  These keywords were detected in the
                  job description but were not found in
                  the generated resume. Only add them if
                  they genuinely apply to the candidate.

                </p>


                {result.atsPreview.keywordAnalysis
                  .criticalMissing?.length > 0 && (

                  <>

                    <p className="text-xs font-medium text-rose-500 mb-2">
                      Critical Keywords
                    </p>

                    <div className="flex flex-wrap gap-2 mb-5">

                      {result.atsPreview.keywordAnalysis
                        .criticalMissing
                        .map((keyword) => (

                          <Chip
                            key={keyword}
                            variant="red"
                          >
                            {keyword}
                          </Chip>

                        ))}

                    </div>

                  </>

                )}


                {result.atsPreview.keywordAnalysis
                  .missing
                  ?.filter(
                    (keyword) =>
                      !result.atsPreview.keywordAnalysis
                        .criticalMissing
                        ?.includes(keyword)
                  )
                  .length > 0 && (

                  <>

                    <p className="text-xs font-medium text-slate-400 mb-2">
                      Additional Keywords
                    </p>

                    <div className="flex flex-wrap gap-2">

                      {result.atsPreview.keywordAnalysis
                        .missing
                        .filter(
                          (keyword) =>
                            !result.atsPreview.keywordAnalysis
                              .criticalMissing
                              ?.includes(keyword)
                        )
                        .map((keyword) => (

                          <Chip
                            key={keyword}
                            variant="neutral"
                          >
                            {keyword}
                          </Chip>

                        ))}

                    </div>

                  </>

                )}

              </Card>

            )}


            {/* TOP IMPROVEMENTS */}

            {result.atsPreview.topImprovements
              ?.length > 0 && (

              <Card>

                <h3 className="font-semibold mb-4">
                  Top Improvements
                </h3>

                <div className="space-y-3">

                  {result.atsPreview.topImprovements.map(
                    (imp, index) => (

                      <div
                        key={index}
                        className="flex items-start gap-3"
                      >

                        <Chip
                          variant={
                            imp.impact === 'High'
                              ? 'red'
                              : imp.impact === 'Medium'
                              ? 'brand'
                              : 'neutral'
                          }
                        >
                          {imp.impact}
                        </Chip>

                        <p className="text-sm text-slate-600 dark:text-slate-300">

                          <strong>
                            {imp.area}:
                          </strong>{' '}

                          {imp.suggestion}

                        </p>

                      </div>

                    )
                  )}

                </div>

              </Card>

            )}

          </div>

        )}

    </div>
  );
}