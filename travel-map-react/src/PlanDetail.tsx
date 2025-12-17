import { useEffect, useState } from 'react';
import { Layout, Typography, Spin, Space, Button } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { api } from './api';
import type { Spot, Route as RouteType, Question, Reference, Food, Config, GuideImage, Schedule } from './api';
import './App.css';
import { useParams, useNavigate } from 'react-router-dom';

import { MapSection } from './components/MapSection';
import { GuideMapSection } from './components/GuideMapSection';
import { ScheduleListSection } from './components/ScheduleListSection';
import { SpotListSection } from './components/SpotListSection';
import { FoodListSection } from './components/FoodListSection';
import { RouteListSection } from './components/RouteListSection';
import { QuestionListSection } from './components/QuestionListSection';
import { ReferenceListSection } from './components/ReferenceListSection';

const { Header, Content, Footer } = Layout;
const { Title } = Typography;

function PlanDetail() {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();

  const [spots, setSpots] = useState<Spot[]>([]);
  const [foods, setFoods] = useState<Food[]>([]);
  const [routes, setRoutes] = useState<RouteType[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [references, setReferences] = useState<Reference[]>([]);
  const [config, setConfig] = useState<Config>({ map_image: '' });
  const [guideImages, setGuideImages] = useState<GuideImage[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (planId) {
      loadData(planId);
    }
  }, [planId]);

  const loadData = async (id: string) => {
    try {
      const [s, f, r, q, ref, c, g, sch] = await Promise.all([
        api.getSpots(id),
        api.getFoods(id),
        api.getRoutes(id),
        api.getQuestions(id),
        api.getReferences(id),
        api.getConfig(id),
        api.getGuideImages(id),
        api.getSchedules(id),
      ]);
      setSpots(s || []);
      setFoods(f || []);
      setRoutes(r || []);
      setQuestions(q || []);
      setReferences(ref || []);
      setConfig(c || { map_image: '' });
      setGuideImages(g || []);
      setSchedules(sch || []);
    } catch (e) {
      console.error("Failed to load data", e);
    } finally {
      setLoading(false);
    }
  };

  if (!planId) return <div>Invalid Plan ID</div>;
  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Spin size="large" /></div>;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', background: '#fff', borderBottom: '1px solid #f0f0f0', padding: '0 24px' }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/')} style={{ marginRight: 16 }}>返回列表</Button>
        <Title level={3} style={{ margin: 0 }}>旅游地图助手</Title>
      </Header>
      <Content style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <MapSection
            planId={planId}
            config={config}
            spots={spots}
            onSaveConfig={(c) => {
              setConfig(c);
              api.saveConfig(planId, c);
            }}
            onSaveSpots={(s) => {
              setSpots(s);
              api.saveSpots(planId, s);
            }}
          />

          <GuideMapSection images={guideImages} onSave={(g) => {
            setGuideImages(g);
            api.saveGuideImages(planId, g);
          }} />

          <ScheduleListSection schedules={schedules} onSave={(s) => {
            setSchedules(s);
            api.saveSchedules(planId, s);
          }} />

          <SpotListSection
            spots={spots}
            destinationName={config.destination?.name}
            onSave={(s) => {
              setSpots(s);
              api.saveSpots(planId, s);
            }}
          />

          <FoodListSection foods={foods} onSave={(f) => {
            setFoods(f);
            api.saveFoods(planId, f);
          }} />

          <RouteListSection routes={routes} onSave={(r) => {
            setRoutes(r);
            api.saveRoutes(planId, r);
          }} />

          <QuestionListSection questions={questions} onSave={(q) => {
            setQuestions(q);
            api.saveQuestions(planId, q);
          }} />

          <ReferenceListSection references={references} onSave={(r) => {
            setReferences(r);
            api.saveReferences(planId, r);
          }} />
        </Space>
      </Content>
      <Footer style={{ textAlign: 'center' }}>旅游地图助手 ©{new Date().getFullYear()}</Footer>
    </Layout>
  );
}

export default PlanDetail;
