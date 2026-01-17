import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Example route placeholder
app.get('/api/projects', async (req, res) => {
    try {
        const projects = await prisma.project.findMany({});
        res.json(projects);
    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
});

// Helper to find project by key
async function getProject(key: string) {
  return await prisma.project.findUnique({ where: { key } });
}

// Helper to ensure project exists
async function ensureProject(key: string) {
  let project = await prisma.project.findUnique({ where: { key } });
  if (!project) {
     console.log(`Creating new project for key: ${key}`);
     project = await prisma.project.create({
       data: {
         key,
         name: key,
         lead: 'Unassigned',
         type: 'Software',
         stakeholders: [],
         quickLinks: [],
         savedFilters: []
       }
     });
  }
  return project;
}

// --- Sync Projects ---
app.post('/api/projects/sync', async (req, res) => {
    try {
        const projects = req.body; // Expect [{ key, name, ... }]
        if (!Array.isArray(projects)) {
             return res.status(400).json({ error: 'Invalid payload' });
        }

        console.log(`Syncing ${projects.length} projects...`);
        
        for (const p of projects) {
            await prisma.project.upsert({
                where: { key: p.key },
                update: { 
                    name: p.name,
                    avatarUrl: p.avatarUrls?.['48x48'] || p.avatarUrl 
                },
                create: {
                    key: p.key,
                    name: p.name,
                    lead: 'Unassigned',
                    type: p.projectTypeKey || 'Software',
                    avatarUrl: p.avatarUrls?.['48x48'] || p.avatarUrl,
                    stakeholders: [],
                    quickLinks: [],
                    savedFilters: []
                }
            });
        }
        res.json({ success: true, count: projects.length });
    } catch (e) {
        console.error('Error syncing projects:', e);
        res.status(500).json({ error: 'Failed to sync projects' });
    }
});

// --- Stakeholders ---
app.get('/api/projects/:key/stakeholders', async (req, res) => {
    try {
        const project = await prisma.project.findUnique({ where: { key: req.params.key } });
        if (!project) return res.json([]); 

        res.json(project.stakeholders || []);
    } catch (e) {
        console.error('Error getting stakeholders:', e);
        res.status(500).json({ error: 'Failed to fetch stakeholders' });
    }
});

app.post('/api/projects/:key/stakeholders', async (req, res) => {
    try {
        const key = req.params.key;
        const newStakeholders = req.body; // Expect array
        
        if (!Array.isArray(newStakeholders)) return res.status(400).json({ error: 'Invalid data' });

        // Map incoming data to strict structure matching Prisma type
        const stakeData = newStakeholders.map((s: any) => ({
             id: s.id || Math.random().toString(36).substr(2, 9),
             role: s.role,
             accountId: s.user?.accountId || s.accountId,
             displayName: s.user?.displayName || s.displayName,
             avatarUrl: s.user?.avatarUrl || s.avatarUrl
        }));

        const project = await prisma.project.update({
            where: { key },
            data: { stakeholders: stakeData }
        });
        
        res.json(project.stakeholders);
    } catch (e) {
        console.error('Error saving stakeholders:', e);
        res.status(500).json({ error: 'Failed to save stakeholders' });
    }
});

// --- Quick Links ---
app.get('/api/projects/:key/links', async (req, res) => {
    try {
        const project = await prisma.project.findUnique({ where: { key: req.params.key } });
        if (!project) return res.json([]); 

        res.json(project.quickLinks || []);
    } catch (e) {
        console.error('Error getting links:', e);
        res.status(500).json({ error: 'Failed to fetch links' });
    }
});

app.post('/api/projects/:key/links', async (req, res) => {
    try {
        const key = req.params.key;
        const newLinks = req.body;
        
        if (!Array.isArray(newLinks)) return res.status(400).json({ error: 'Invalid data' });

        const linkData = newLinks.map((l: any) => ({
            id: l.id || Math.random().toString(36).substr(2, 9),
            name: l.name,
            url: l.url
        }));

        const project = await prisma.project.update({
            where: { key },
            data: { quickLinks: linkData }
        });
        
        res.json(project.quickLinks);
    } catch (e) {
        console.error('Error saving links:', e);
        res.status(500).json({ error: 'Failed to save links' });
    }
});

// --- Filters ---
app.get('/api/projects/:key/filters', async (req, res) => {
    try {
        const project = await prisma.project.findUnique({ where: { key: req.params.key } });
        if (!project) return res.json([]);

        res.json(project.savedFilters || []);
    } catch (e) {
        console.error('Error getting filters:', e);
        res.status(500).json({ error: 'Failed to fetch filters' });
    }
});

app.post('/api/projects/:key/filters', async (req, res) => {
    try {
        const key = req.params.key;
        const newFilters = req.body;
        
        if (!Array.isArray(newFilters)) return res.status(400).json({ error: 'Invalid data' });

        const filterData = newFilters.map((f: any) => ({
            id: f.id || Math.random().toString(36).substr(2, 9),
            name: f.name,
            jql: f.jql,
            description: f.description || ''
        }));

        const project = await prisma.project.update({
            where: { key },
            data: { savedFilters: filterData }
        });
        
        res.json(project.savedFilters);
    } catch (e) {
        console.error('Error saving filters:', e);
        res.status(500).json({ error: 'Failed to save filters' });
    }
});

// --- Overview ---
app.get('/api/projects/:key/overview', async (req, res) => {
     try {
        const project = await prisma.project.findUnique({ where: { key: req.params.key } });
        if (!project || !project.overview) return res.status(404).json({ error: 'Overview not found' });

        // Overview is embedded now
        res.json(project.overview);
    } catch (e) {
        console.error('Error getting overview:', e);
        res.status(500).json({ error: 'Failed to fetch overview' });
    }
});

app.post('/api/projects/:key/overview', async (req, res) => {
    try {
        const key = req.params.key;
        const data = req.body;
        
        // Flatten logic
        const ov = data.overview || {};
        
        const overviewData = {
            schdHealth: ov.schdHealth || 'yellow',
            complexity: ov.complexity || 'Medium',
            projectType: ov.projectType,
            planStartDate: ov.planStartDate,
            planEndDate: ov.planEndDate,
            percentComplete: ov.percentComplete,
            clientLocation: ov.clientLocation,
            currentPhase: ov.currentPhase,
            bpwTargetMargin: ov.bpwTargetMargin,
            budget: data.budget || {},
            health: data.health || {}
        };

        const project = await prisma.project.update({
            where: { key },
            data: { overview: overviewData }
        });
        
        res.json(project.overview);
    } catch (e) {
        console.error('Error saving overview:', e);
        res.status(500).json({ error: 'Failed to save overview' });
    }
});

app.listen(port, () => {
  console.log(`Backend server running on http://localhost:${port}`);
});
