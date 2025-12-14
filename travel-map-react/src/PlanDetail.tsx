import { useEffect, useState } from 'react';
import { Layout, Typography, Spin, Space, Button } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { api } from './api';
import type { Spot, Route as RouteType, Question, Config, GuideImage } from './api';
import './App.css';
import { useParams, useNavigate } from 'react-router-dom';

import { MapSection } from './components/MapSection';
import { GuideMapSection } from './components/GuideMapSection';
import { SpotListSection } from './components/SpotListSection';
import { RouteListSection } from './components/RouteListSection';
import { QuestionListSection } from './components/QuestionListSection';

const { Header, Content, Footer } = Layout;
const { Title } = Typography;

function PlanDetail() {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();

  const [spots, setSpots] = useState<Spot[]>([]);
  const [routes, setRoutes] = useState<RouteType[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [config, setConfig] = useState<Config>({ map_image: '' });
  const [guideImages, setGuideImages] = useState<GuideImage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (planId) {
      loadData(planId);
    }
  }, [planId]);

  const loadData = async (id: string) => {
    try {
      const [s, r, q, c, g] = await Promise.all([
        api.getSpots(id),
        api.getRoutes(id),
        api.getQuestions(id),
        api.getConfig(id),
        api.getGuideImages(id),
      ]);
      setSpots(s || []);
      setRoutes(r || []);
      setQuestions(q || []);
      setConfig(c || { map_image: '' });
      setGuideImages(g || []);
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

          <SpotListSection spots={spots} onSave={(s) => {
            setSpots(s);
            api.saveSpots(planId, s);
          }} />

          <RouteListSection routes={routes} onSave={(r) => {
            setRoutes(r);
            api.saveRoutes(planId, r);
          }} />

          <QuestionListSection questions={questions} onSave={(q) => {
            setQuestions(q);
            api.saveQuestions(planId, q);
          }} />
        </Space>
      </Content>
      <Footer style={{ textAlign: 'center' }}>旅游地图助手 ©{new Date().getFullYear()}</Footer>
    </Layout>
  );
}

export default PlanDetail;
