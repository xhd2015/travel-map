import { useEffect, useState } from 'react';
import { Layout, Typography, Spin, Space, Button } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { api } from './api';
import type { Spot, Route as RouteType, Question, Reference, Food, Config, GuideImage, Schedule, ItineraryItem } from './api';
import './App.css';
import { useParams, useNavigate } from 'react-router-dom';

import { MapSection } from './components/MapSection';
import { GuideMapSection } from './components/GuideMapSection';
import { ScheduleListSection } from './components/ScheduleListSection';
import { ItinerarySection } from './components/ItinerarySection';
import { SpotListSection } from './components/SpotListSection';
import { FoodListSection } from './components/FoodListSection';
import { RouteListSection } from './components/RouteListSection';
import { QuestionListSection } from './components/QuestionListSection';
import { ReferenceListSection } from './components/ReferenceListSection';

const { Header, Content, Footer } = Layout;
const { Title } = Typography;

function DestinationDetail() {
  const { planId, destId } = useParams<{ planId: string; destId: string }>();
  const navigate = useNavigate();

  const [spots, setSpots] = useState<Spot[]>([]);
  const [foods, setFoods] = useState<Food[]>([]);
  const [routes, setRoutes] = useState<RouteType[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [references, setReferences] = useState<Reference[]>([]);
  const [config, setConfig] = useState<Config>({ map_image: '' });
  const [guideImages, setGuideImages] = useState<GuideImage[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [itineraries, setItineraries] = useState<ItineraryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (planId && destId) {
      loadData(planId, destId);
    }
  }, [planId, destId]);

  const loadData = async (pId: string, dId: string) => {
    try {
      const [
        fetchedSpots,
        fetchedFoods,
        fetchedRoutes,
        fetchedQuestions,
        fetchedReferences,
        fetchedConfig,
        fetchedGuideImages,
        fetchedSchedules,
        fetchedItineraries
      ] = await Promise.all([
        api.getSpots(pId, dId),
        api.getFoods(pId, dId),
        api.getRoutes(pId, dId),
        api.getQuestions(pId, dId),
        api.getReferences(pId, dId),
        api.getConfig(pId, dId),
        api.getGuideImages(pId, dId),
        api.getSchedules(pId, dId),
        api.getItineraries(pId, dId),
      ]);
      setSpots(fetchedSpots || []);
      setFoods(fetchedFoods || []);
      setRoutes(fetchedRoutes || []);
      setQuestions(fetchedQuestions || []);
      setReferences(fetchedReferences || []);
      setConfig(fetchedConfig || { map_image: '' });
      setGuideImages(fetchedGuideImages || []);
      setSchedules(fetchedSchedules || []);
      setItineraries(fetchedItineraries || []);
    } catch (e) {
      console.error("Failed to load data", e);
    } finally {
      setLoading(false);
    }
  };

  if (!planId || !destId) return <div>Invalid URL</div>;
  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Spin size="large" /></div>;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', background: '#fff', borderBottom: '1px solid #f0f0f0', padding: '0 24px' }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/plans/${planId}`)} style={{ marginRight: 16 }}>返回目的地列表</Button>
        <Title level={3} style={{ margin: 0 }}>旅游规划详情</Title>
      </Header>
      <Content style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <MapSection
            planId={planId}
            destId={destId} // Passed destId
            config={config}
            spots={spots}
            onSaveConfig={(c) => {
              setConfig(c);
              api.saveConfig(planId, destId, c);
            }}
            onSaveSpots={(s) => {
              setSpots(s);
              api.saveSpots(planId, destId, s);
            }}
          />

          <GuideMapSection images={guideImages} onSave={(g) => {
            setGuideImages(g);
            api.saveGuideImages(planId, destId, g);
          }} />

          <ScheduleListSection schedules={schedules} onSave={(s) => {
            setSchedules(s);
            api.saveSchedules(planId, destId, s);
          }} />

          <ItinerarySection
            itineraries={itineraries}
            onSave={(i) => {
              setItineraries(i);
              api.saveItineraries(planId, destId, i);
            }}
            destinationName={config.destination?.name}
            spots={spots}
          />

          <SpotListSection
            spots={spots}
            destinationName={config.destination?.name}
            onSave={(s) => {
              setSpots(s);
              api.saveSpots(planId, destId, s);
            }}
          />

          <FoodListSection foods={foods} onSave={(f) => {
            setFoods(f);
            api.saveFoods(planId, destId, f);
          }} />

          <RouteListSection routes={routes} onSave={(r) => {
            setRoutes(r);
            api.saveRoutes(planId, destId, r);
          }} />

          <QuestionListSection questions={questions} onSave={(q) => {
            setQuestions(q);
            api.saveQuestions(planId, destId, q);
          }} />

          <ReferenceListSection references={references} onSave={(r) => {
            setReferences(r);
            api.saveReferences(planId, destId, r);
          }} />
        </Space>
      </Content>
      <Footer style={{ textAlign: 'center' }}>旅游地图助手 ©{new Date().getFullYear()}</Footer>
    </Layout>
  );
}

export default DestinationDetail;
